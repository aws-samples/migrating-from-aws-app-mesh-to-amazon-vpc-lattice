#!/bin/bash

export ACCOUNT_ID=`aws sts get-caller-identity --query "Account" --output text`

#Disable AWS CLI command response pagination
export AWS_PAGER=''

chmod a+x $GIT_BASE_DIR/account_details.sh
echo "export ACCOUNT_ID=$ACCOUNT_ID" >> $GIT_BASE_DIR/account_details.sh
echo "export AWS_PAGER=''" >> $GIT_BASE_DIR/account_details.sh

read -p "Enter the VPC ID to deploy AppMesh, VPC Lattice and ALB resources: " VPC_ID
echo "export VPC_ID=$VPC_ID" >> $GIT_BASE_DIR/account_details.sh
export VPC_ID=$VPC_ID
