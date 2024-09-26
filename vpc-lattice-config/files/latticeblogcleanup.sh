#!/bin/bash
set -e

cleanup(){
        # Deployments
        echo "Remove the Sample App Resources"
        kubectl get deployments -n prodcatalog-ns -o name | xargs -n1 kubectl delete --grace-period=0
        kubectl get svc -n prodcatalog-ns -o name | xargs -n1 kubectl delete --grace-period=0

        echo "Remove the VPC Lattice Resources within the Cluster"
        kubectl get httproutes -n prodcatalog-ns -o name | xargs -n1 kubectl delete --grace-period=0
        kubectl get targetgrouppolicies -n prodcatalog-ns -o name | xargs -n1 kubectl delete --grace-period=0
        kubectl delete gateway product-catalog-lattice-gw

        echo "Uninstall the VPC Lattice Gateway"
        helm uninstall gateway-api-controller -n aws-application-networking-system
        eksctl delete iamserviceaccount \
            --cluster="${CLUSTER_NAME}" \
            --namespace=aws-application-networking-system \
            --name=gateway-api-controller
        kubectl delete ns aws-application-networking-system

        ehco "Sleeping for 30s while the VPC lattice resources are removed"
        sleep 30

        echo "Removing the VPC Lattice service network"
        SERVICE_NETWORK=$(aws vpc-lattice list-service-networks | jq -r '.items | .[0].id')
        VPC_ASSOCIATION_ARN=$(aws vpc-lattice list-service-network-vpc-associations --service-network-identifier "${SERVICE_NETWORK}" | jq -r '.items | .[0].arn')
        aws vpc-lattice delete-service-network-vpc-association --service-network-vpc-association-identifier "${VPC_ASSOCIATION_ARN}"

        # We have to wait for the VPC association to be deleted before we can delete the service network
        sleep 10
        aws vpc-lattice delete-service-network --service-network-identifier "${SERVICE_NETWORK}"

        echo "Delete the EKS Cluster"
        cat vpc-lattice-config/files/clusterconfig.yaml |envsubst| eksctl delete cluster -f -

        # Clean up ecr images...
        for app in catalog_detail product_catalog frontend_node;
        do
            aws ecr delete-repository --repository-name eks-app-mesh-to-vpc-lattice/$app --force
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
    		break;;
    	[nN] ) echo exiting...;
    		exit;;
    	* ) echo invalid response;;
    esac
done
