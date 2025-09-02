#!/bin/bash

read -p "Enter the Systems Manager Parameter Store - parameter name for the Aurora PostgreSQL connection string: " AURORA_PG_PARAMETER
echo "export AURORA_PG_PARAMETER=$AURORA_PG_PARAMETER" >> $GIT_BASE_DIR/account_details.sh
export AURORA_PG_PARAMETER=$AURORA_PG_PARAMETER

read -p "Enter the ECS Task Role Name: " ECS_TASK_ROLE
echo "export ECS_TASK_ROLE=$ECS_TASK_ROLE" >> $GIT_BASE_DIR/account_details.sh
export ECS_TASK_ROLE=$ECS_TASK_ROLE

read -p "Enter the ECS Task Execution Role Name: " ECS_TASK_EXECUTION_ROLE
echo "export ECS_TASK_EXECUTION_ROLE=$ECS_TASK_EXECUTION_ROLE" >> $GIT_BASE_DIR/account_details.sh
export ECS_TASK_EXECUTION_ROLE=$ECS_TASK_EXECUTION_ROLE

read -p "Enter the ECS Cluster Name: " CLUSTER_NAME
echo "export CLUSTER_NAME=$CLUSTER_NAME" >> $GIT_BASE_DIR/account_details.sh
export CLUSTER_NAME=$CLUSTER_NAME

read -p "Enter the Security Group ID for Product microservice: " SECURITY_GROUP_ID
echo "export SECURITY_GROUP_ID=$SECURITY_GROUP_ID" >> $GIT_BASE_DIR/account_details.sh
export SECURITY_GROUP_ID=$SECURITY_GROUP_ID

echo -e "\n\nNext we will collect 3 subnets for the Product microservice. \n\nIf you have less than 3 subnets, edit the \n$GIT_BASE_DIR/appmesh-lattice-onboarding-files/product-service.json.template file to \nadjust the number of subnets in the 'networkConfiguration', before proceeding with the remainder of this script\n\n"

read -p "Enter the first subnet for Product microservice: " SUBNET1
echo "export SUBNET1=$SUBNET1" >> $GIT_BASE_DIR/account_details.sh
export SUBNET1=$SUBNET1

read -p "Enter the second subnet for Product microservice: " SUBNET2
echo "export SUBNET2=$SUBNET2" >> $GIT_BASE_DIR/account_details.sh
export SUBNET2=$SUBNET2

read -p "Enter the third subnet for Product microservice: " SUBNET3
echo "export SUBNET3=$SUBNET3" >> $GIT_BASE_DIR/account_details.sh
export SUBNET3=$SUBNET3