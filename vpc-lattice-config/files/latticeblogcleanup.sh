#!/bin/bash
set -e
echo -e "Running 'eksctl get clusters'\n"
eksctl get clusters
cleanup(){
        # we use 'set -e' that results in breaking out if a step fails. I don't want to remove 'set -e', so,
        # breaking out of the script with next command if we try running this script again, adding 'true' to ignore it

        # Deployments
        echo "Remove the Sample App Resources"
        kubectl get deployments -n prodcatalog-ns -o name | xargs -n1 kubectl delete -n prodcatalog-ns --grace-period=0
        kubectl get svc -n prodcatalog-ns -o name | xargs -n1 kubectl delete -n prodcatalog-ns --grace-period=0

        echo "Remove the VPC Lattice Resources within the Cluster"
        kubectl get httproutes -n prodcatalog-ns -o name | xargs -n1 kubectl delete -n prodcatalog-ns --grace-period=0
        kubectl get targetgrouppolicies -n prodcatalog-ns -o name | xargs -n1 kubectl delete -n prodcatalog-ns --grace-period=0
        kubectl delete gateway product-catalog-lattice-gw -n prodcatalog-ns --grace-period=0 --force --wait=0|| true
        kubectl delete ns prodcatalog-ns --grace-period=0 --force --wait=0 || true
        echo "Uninstall the VPC Lattice Gateway"
        helm uninstall gateway-api-controller -n aws-application-networking-system ||true
        eksctl delete iamserviceaccount \
            --cluster="${CLUSTER_NAME}" \
            --namespace=aws-application-networking-system \
            --name=gateway-api-controller || true
        
        kubectl delete ns aws-application-networking-system || true

        echo "Sleeping for 30s while the VPC lattice resources are removed"
        sleep 30

        echo "Removing the VPC Lattice service network"
        SERVICE_NETWORK=$(aws vpc-lattice list-service-networks | jq -r '.items | .[0].id')
        VPC_ASSOCIATION_ARN=$(aws vpc-lattice list-service-network-vpc-associations --service-network-identifier "${SERVICE_NETWORK}" | jq -r '.items | .[0].arn')
        aws vpc-lattice delete-service-network-vpc-association --service-network-vpc-association-identifier "${VPC_ASSOCIATION_ARN}"|| true

        # We have to wait for the VPC association to be deleted before we can delete the service network
        sleep 10
        aws vpc-lattice delete-service-network --service-network-identifier "${SERVICE_NETWORK}"||true

        VPCLatticeControllerIAMPolicyArn=$(aws iam list-policies --query 'Policies[?PolicyName==`VPCLatticeControllerIAMPolicy`].Arn' --output text||true)
        VPCLatticeIAMPolicyForProdcatalogArn=$(aws iam list-policies --query 'Policies[?PolicyName==`VPCLatticeIAMPolicyForProdcatalog`].Arn' --output text||true)
        ProdEnvoyNamespaceIAMPolicRole=$(aws iam list-entities-for-policy --policy-arn $ProdEnvoyNamespaceIAMPolicArn --query 'PolicyRoles[*].RoleName' --output text || true) 
        AWSAppMeshK8sControllerIAMPolicyRole=$(aws iam list-entities-for-policy --policy-arn $AWSAppMeshK8sControllerIAMPolicyArn --query 'PolicyRoles[*].RoleName' --output text |true) 
        aws iam detach-role-policy --role-name VPCLatticeControllerIAMRole --policy-arn=$VPCLatticeControllerIAMPolicyArn || true
        aws iam detach-role-policy --role-name VPCLatticeIAMRoleForProdcatalog --policy-arn=$VPCLatticeIAMPolicyForProdcatalogArn || true
        aws iam detach-role-policy --policy-arn $ProdEnvoyNamespaceIAMPolicArn --role-name $ProdEnvoyNamespaceIAMPolicRole || true
        aws iam detach-role-policy --policy-arn $AWSAppMeshK8sControllerIAMPolicyArn --role-name $AWSAppMeshK8sControllerIAMPolicyRole || true
        aws iam delete-policy --policy-arn $VPCLatticeControllerIAMPolicyArn || true
        aws iam delete-policy --policy-arn $VPCLatticeIAMPolicyForProdcatalogArn || true
        aws iam delete-policy --policy-arn $ProdEnvoyNamespaceIAMPolicArn || true
        aws iam delete-policy --policy-arn $AWSAppMeshK8sControllerIAMPolicyArn || true
        aws iam delete-role --role-name VPCLatticeIAMRoleForProdcatalog || true
        aws iam delete-role --role-name VPCLatticeControllerIAMRole || true
        eksctl delete iamserviceaccount --cluster ${CLUSTER_NAME}  --name appmesh-controller || true
        echo "Delete the EKS Cluster"

        delete_cluster='cat vpc-lattice-config/files/clusterconfig.yaml |envsubst| eksctl delete cluster -f -'
        eval $delete_cluster || true

        # Clean up ecr images...
        for app in catalog_detail product_catalog frontend_node;
        do
            aws ecr delete-repository --repository-name eks-app-mesh-to-vpc-lattice/$app --force || true
        done
}

read -p "Enter your cluster name: " CLUSTER_NAME
if [ -z "$CLUSTER_NAME" ]; then
  echo "Cluster name cannot be empty."
  exit 1
fi

while true; do
    read -p "This will delete all the resources and EKS cluster '${CLUSTER_NAME}'. Do you want to proceed? (y/n) " yn
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
