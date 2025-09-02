#!/bin/bash

export ACCOUNT_ID=`aws sts get-caller-identity --query "Account" --output text`
chmod a+x $GIT_BASE_DIR/account_details.sh
echo "export ACCOUNT_ID=$ACCOUNT_ID" >> $GIT_BASE_DIR/account_details.sh

read -p "Enter the VPC ID to deploy AppMesh, VPC Lattice and ALB resources: " VPC_ID
echo "export VPC_ID=$VPC_ID" >> $GIT_BASE_DIR/account_details.sh
export VPC_ID=$VPC_ID
