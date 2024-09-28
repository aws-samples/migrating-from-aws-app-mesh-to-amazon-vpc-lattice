#!/bin/bash
#set -e
# we use 'set -e' that results in breaking out if a step fails. It doesn't work if we need to re-run the script. commenting out 'set -e' for testing 
cleanup(){
        echo -e "Running 'kubectl get ns' in cluster '${CLUSTER_NAME}'\n"
        #kubectl get ns
        echo -e "Running 'eksctl get clusters'\n"
        #eksctl get clusters

        echo "Remove the Sample App Resources"
        kubectl get deployments -n ${NAMESPACE_NAME} -o name | xargs -n1 kubectl delete -n ${NAMESPACE_NAME} --grace-period=0
        kubectl get svc -n ${NAMESPACE_NAME} -o name | xargs -n1 kubectl delete -n ${NAMESPACE_NAME} --grace-period=0

        echo "Remove the VPC Lattice Resources within the Cluster"
        kubectl get targetgrouppolicies -n ${NAMESPACE_NAME} -o name | xargs -n1 kubectl delete -n ${NAMESPACE_NAME} --grace-period=0
        kubectl get httproutes -n ${NAMESPACE_NAME} -o name | xargs -n1 kubectl delete -n ${NAMESPACE_NAME} --grace-period=0
        kubectl delete gateway product-catalog-lattice-gw -n ${NAMESPACE_NAME} --grace-period=0 --force --wait=0
        echo "Sleeping for 60s while the VPC lattice resources are removed"
        sleep 60
        kubectl delete ns ${NAMESPACE_NAME} --grace-period=0 --force --wait=0
        echo "Uninstall the VPC Lattice Gateway"
        helm uninstall gateway-api-controller -n aws-application-networking-system
        eksctl delete iamserviceaccount \
            --cluster="${CLUSTER_NAME}" \
            --namespace=aws-application-networking-system \
            --name=gateway-api-controller
        
        kubectl delete ns aws-application-networking-system

        echo "Removing the VPC Lattice service network"
        SERVICE_NETWORK=$(aws vpc-lattice list-service-networks | jq -r '.items | .[0].id')
        VPC_ASSOCIATION_ARN=$(aws vpc-lattice list-service-network-vpc-associations --service-network-identifier "${SERVICE_NETWORK}" | jq -r '.items | .[0].arn')
        aws vpc-lattice delete-service-network-vpc-association --service-network-vpc-association-identifier "${VPC_ASSOCIATION_ARN}"

        # We have to wait for the VPC association to be deleted before we can delete the service network
        sleep 10
        aws vpc-lattice delete-service-network --service-network-identifier "${SERVICE_NETWORK}"

        VPCLatticeControllerIAMPolicyArn=$(aws iam list-policies --query 'Policies[?PolicyName==`VPCLatticeControllerIAMPolicy`].Arn' --output text)
        VPCLatticeIAMPolicyForProdcatalogArn=$(aws iam list-policies --query 'Policies[?PolicyName==`VPCLatticeIAMPolicyForProdcatalog`].Arn' --output text)
        ProdEnvoyNamespaceIAMPolicRole=$(aws iam list-entities-for-policy --policy-arn $ProdEnvoyNamespaceIAMPolicyArn --query 'PolicyRoles[*].RoleName' --output text 2>/dev/null) 
        AWSAppMeshK8sControllerIAMPolicyRole=$(aws iam list-entities-for-policy --policy-arn $AWSAppMeshK8sControllerIAMPolicyArn --query 'PolicyRoles[*].RoleName' --output text 2>/dev/null) 
        aws iam detach-role-policy --role-name VPCLatticeControllerIAMRole --policy-arn=$VPCLatticeControllerIAMPolicyArn 2>/dev/null
        aws iam detach-role-policy --role-name VPCLatticeIAMRoleForProdcatalog --policy-arn=$VPCLatticeIAMPolicyForProdcatalogArn 2>/dev/null
        aws iam detach-role-policy --policy-arn $ProdEnvoyNamespaceIAMPolicyArn --role-name $ProdEnvoyNamespaceIAMPolicRole 2>/dev/null
        aws iam detach-role-policy --policy-arn $AWSAppMeshK8sControllerIAMPolicyArn --role-name $AWSAppMeshK8sControllerIAMPolicyRole 2>/dev/null
        aws iam delete-policy --policy-arn $VPCLatticeControllerIAMPolicyArn 2>/dev/null
        aws iam delete-policy --policy-arn $VPCLatticeIAMPolicyForProdcatalogArn 2>/dev/null
        aws iam delete-policy --policy-arn $ProdEnvoyNamespaceIAMPolicyArn 2>/dev/null
        aws iam delete-policy --policy-arn $AWSAppMeshK8sControllerIAMPolicyArn 2>/dev/null
        aws iam delete-role --role-name VPCLatticeIAMRoleForProdcatalog
        aws iam delete-role --role-name VPCLatticeControllerIAMRole
        eksctl delete iamserviceaccount --cluster ${CLUSTER_NAME}  --name appmesh-controller
        echo "Delete the EKS Cluster"

        delete_cluster='cat vpc-lattice-config/files/clusterconfig.yaml |envsubst| eksctl delete cluster -f -'
        eval $delete_cluster

        # Clean up ecr images...
        for app in catalog_detail product_catalog frontend_node;
        do
            aws ecr delete-repository --repository-name eks-app-mesh-to-vpc-lattice/$app --force
        done
}

read -p "Enter your cluster name: " CLUSTER_NAME
if [[ -z "$CLUSTER_NAME" ]]; then
  echo "Cluster name cannot be empty."
  exit 1
fi

read -p "Enter your namespace name: " NAMESPACE_NAME
if [[ -z "$NAMESPACE_NAME" ]]; then
  echo "Namespace name cannot be empty."
  exit 1
fi

while true; do
    read -p "This will delete all the resources in namespace '${NAMESPACE_NAME}' along with the EKS cluster '${CLUSTER_NAME}'. Do you want to proceed? (y/n) " yn
    case $yn in
    	[yY] ) echo ok, we will proceed with cleanup;
            sleep 5;
            cleanup;
    		exit 0;;
    	[nN] ) echo exiting...;
    		exit;;
    	* ) echo invalid response;;
    esac
done
