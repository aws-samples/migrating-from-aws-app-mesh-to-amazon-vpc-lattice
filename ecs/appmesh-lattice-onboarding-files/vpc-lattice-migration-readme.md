# Migrating from AWS App Mesh to VPC Lattice

This guide provides step-by-step instructions for migrating your product service from AWS App Mesh to VPC Lattice.

## Prerequisites

- Existing ECS product service integrated with App Mesh
- AWS CLI configured with appropriate permissions
- VPC where your ECS tasks are running

## Step 1: Update Task Definition

```bash
cd ../appmesh-lattice-onboarding-files/
```

- Task definition template without App Mesh components is saved in `product-taskdef-lattice.json.template`.
- We removed envoy and xray-daemon containers and associated configuration dependencies. We added a health check for the `product-ms` container

- Run commands to modify placeholders AURORA_PG_PARAMETER, ACCOUNT_ID, ECS_TASK_ROLE and ECS_TASK_EXECUTION_ROLE.

```bash
perl -pe 's/ACCOUNT_ID/'$ACCOUNT_ID'/g' product-taskdef-lattice.json.template > product-taskdef-lattice.json
perl -pi -e 's/ECS_TASK_ROLE/'$ECS_TASK_ROLE'/g' product-taskdef-lattice.json
perl -pi -e 's/ECS_TASK_EXECUTION_ROLE/'$ECS_TASK_EXECUTION_ROLE'/g' product-taskdef-lattice.json
perl -pi -e 's/AURORA_PG_PARAMETER/'$AURORA_PG_PARAMETER'/g' product-taskdef-lattice.json
```

- Execute below command to register the task definition

```bash
export PRODUCT_TASKDEF_LATTICE_REVISION=`aws ecs register-task-definition \
  --cli-input-json file://product-taskdef-lattice.json \
  --region us-west-2 --query "taskDefinition.revision" --output text`
echo "export PRODUCT_TASKDEF_LATTICE_REVISION=$PRODUCT_TASKDEF_LATTICE_REVISION" >> $GIT_BASE_DIR/account_details.sh
```

## Step 2: Create a VPC Lattice Service Network

If you don't already have a service network, create one:

```bash
export LATTICE_SN_ID=`aws vpc-lattice create-service-network \
  --name test-inventory-network \
  --auth-type NONE \
  --region us-west-2 --query "id" --output text`
echo "export LATTICE_SN_ID=$LATTICE_SN_ID" >> $GIT_BASE_DIR/account_details.sh
```

## Step 3: Associate your VPC used to launch ECS tasks, with the Lattice Service Network.

```bash
export LATTICE_SNVA_ID=`aws vpc-lattice create-service-network-vpc-association \
  --service-network-identifier $LATTICE_SN_ID \
  --vpc-identifier $VPC_ID \
  --region us-west-2 --query "id" --output text`
echo "export LATTICE_SNVA_ID=$LATTICE_SNVA_ID" >> $GIT_BASE_DIR/account_details.sh  
```

Please wait for the VPC to get associated with service network. You can check the status with:

```bash
aws vpc-lattice get-service-network-vpc-association \
  --service-network-vpc-association-identifier $LATTICE_SNVA_ID \
  --region us-west-2
```

## Step 4: Create a VPC Lattice Service

```bash
export LATTICE_PRODUCT_SVC_ID=`aws vpc-lattice create-service \
  --name product-ms-service \
  --auth-type NONE \
  --region us-west-2 --query "id" --output text`
echo "export LATTICE_PRODUCT_SVC_ID=$LATTICE_PRODUCT_SVC_ID" >> $GIT_BASE_DIR/account_details.sh
```

## Step 5: Associate the Service with the Service Network

```bash
export LATTICE_PRODUCT_SNSA_ID=`aws vpc-lattice create-service-network-service-association \
  --service-network-identifier $LATTICE_SN_ID \
  --service-identifier $LATTICE_PRODUCT_SVC_ID \
  --region us-west-2 --query "id" --output text`
echo "export LATTICE_PRODUCT_SNSA_ID=$LATTICE_PRODUCT_SNSA_ID" >> $GIT_BASE_DIR/account_details.sh
```

Wait for the association to complete. You can check the status with:

```bash
aws vpc-lattice get-service-network-service-association \
  --service-network-service-association-identifier $LATTICE_PRODUCT_SNSA_ID \
  --region us-west-2
```

## Step 6: Create a VPC Lattice Target Group

```bash
export LATTICE_PRODUCT_TG_ID=`aws vpc-lattice create-target-group \
  --name product-ms-tg \
  --type IP \
  --config '{
    "port": 5000,
    "protocol": "HTTP",
    "vpcIdentifier": "'$VPC_ID'",
    "healthCheck": {
      "enabled": true,
      "protocol": "HTTP",
      "path": "/",
      "port": 5000,
      "healthCheckIntervalSeconds": 30,
      "healthCheckTimeoutSeconds": 5,
      "healthyThresholdCount": 5,
      "unhealthyThresholdCount": 2,
      "matcher": {
        "httpCode": "200-499"
      }
    }
  }' \
  --region us-west-2 --query "id" --output text`
echo "export LATTICE_PRODUCT_TG_ID=$LATTICE_PRODUCT_TG_ID" >> $GIT_BASE_DIR/account_details.sh
```

## Step 7: Create a Listener for the Service

```bash
aws vpc-lattice create-listener \
  --service-identifier $LATTICE_PRODUCT_SVC_ID \
  --name product-ms-listener \
  --protocol HTTP \
  --port 80 \
  --default-action '{"forward":{"targetGroups":[{"targetGroupIdentifier":"'$LATTICE_PRODUCT_TG_ID'"}]}}' \
  --region us-west-2
```

## Step 8: Update ECS task security group to allow VPC Lattice ingress.

Update Inbound rules of ECS task security group and add a rule to accept traffic from VPC Lattice prefix list `com.amazonaws.us-west-2.vpc-lattice (pl-0721453c7ac4ec009)` on port 5000 (product service).

## Step 9: Create a Lattice role for VPC lattice service.

- Create trust policy for ECS service

```bash
cat > lattice-trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "ecs.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF
```

- Create the IAM role

```bash
aws iam create-role --role-name ecsLatticeRole --assume-role-policy-document file://lattice-trust-policy.json
```

- Attach the VPC Lattice policy

```bash
aws iam attach-role-policy --role-name ecsLatticeRole --policy-arn arn:aws:iam::aws:policy/AmazonECSInfrastructureRolePolicyForVpcLattice
```

## Step 10: Create a new ECS Service with VPC Lattice

- Instead of updating the existing App Mesh service, create a brand new service for a blue-green deployment scenario.
- Replace placeholders CLUSTER_NAME, SUBNET1/2/3, SECURITY_GROUP_ID, LATTICE_ROLE, and LATTICE_TARGET_GROUP, etc.

```bash
perl -pe 's/ACCOUNT_ID/'$ACCOUNT_ID'/g' product-service-lattice.json.template > product-service-lattice.json
perl -pi -e 's/CLUSTER_NAME/'$CLUSTER_NAME'/g' product-service-lattice.json
perl -pi -e 's/PRODUCT_TASKDEF_LATTICE_REVISION/'$PRODUCT_TASKDEF_LATTICE_REVISION'/g' product-service-lattice.json
perl -pi -e 's/SECURITY_GROUP_ID/'$SECURITY_GROUP_ID'/g' product-service-lattice.json
perl -pi -e 's/SUBNET1/'$SUBNET1'/g' product-service-lattice.json
perl -pi -e 's/SUBNET2/'$SUBNET2'/g' product-service-lattice.json
perl -pi -e 's/SUBNET3/'$SUBNET3'/g' product-service-lattice.json
perl -pi -e 's/LATTICE_PRODUCT_TG_ID/'$LATTICE_PRODUCT_TG_ID'/g' product-service-lattice.json
```

- Create the ECS service:
      
```bash
aws ecs create-service \
  --cli-input-json file://product-service-lattice.json \
  --region us-west-2
```

- Check that the new task is running:

```bash
aws ecs list-tasks --cluster $CLUSTER_NAME --service-name product-lattice-service --region us-west-2
```

When you create an ECS service with the vpcLatticeConfigurations parameter, ECS automatically registers the tasks with the specified VPC Lattice target group.

## Step 11: Configure HTTPS (Optional)

To configure HTTPS for your VPC Lattice service:

1. Navigate to the VPC Lattice console
2. Select your service
3. Go to the "Routing" tab
4. Add a new HTTPS listener:
   - Name: https-listener
   - Protocol: HTTPS
   - Port: 443
5. Configure the default action to forward to your target group

## Step 12: Verify VPC Lattice integration

1. Check the health of your targets in VPC Lattice:

```bash
aws vpc-lattice list-targets \
  --target-group-identifier $LATTICE_PRODUCT_TG_ID \
  --region us-west-2
```

2. Test connectivity to your service through VPC Lattice:

- Find the VPC Lattice Domain Name:

```bash
export LATTICE_PRODUCT_DOMAIN_NAME=`aws vpc-lattice get-service-network-service-association \
  --service-network-service-association-identifier $LATTICE_PRODUCT_SNSA_ID \
  --region us-west-2 --query "dnsEntry.domainName" --output text`
echo "export LATTICE_PRODUCT_DOMAIN_NAME=$LATTICE_PRODUCT_DOMAIN_NAME" >> $GIT_BASE_DIR/account_details.sh
```

- From an EC2 instance in the same VPC as your ECS cluster and VPC Lattice resources, test connectivity to the service using the VPC Lattice endpoint

```bash
curl -v http://$LATTICE_PRODUCT_DOMAIN_NAME/api/products
```

## Step 13: Update Frontend application configuration to connect to product-ms service through VPC Lattice, instead of App Mesh.

- Update your frontend-ui task definition and replace the value of environment variable PRODUCTS_DOMAIN with VPC Lattice service domain instead of the App Mesh service domain.
- Update frontend-ui ECS service to use the latest task definition using below command and replace task definition revision value enclosed in <>:

```bash
aws ecs update-service \
--cluster $CLUSTER_NAME \
--service frontend-ui \
--task-definition frontend-ui:<NEW_REVISION> \
--region us-west-2
```

## Step 14: Verify the Migration

1. Wait for the frontend-ui ECS service to complete deployment and test connectivity to your service through VPC Lattice:

```bash
curl -v https://$ALB_ENDPOINT/api/products
```

## Troubleshooting

- **Health Check Failures**: Ensure your application responds with a status code between 200-499 at the root path (/)
- **Connection Issues**: Check security groups to ensure they allow traffic on port 5000
- **Permission Issues**: Verify that the task role has the necessary VPC Lattice permissions
- **DNS Resolution**: If you're having trouble resolving the VPC Lattice domain, check your VPC DNS settings
- **Service Association**: Make sure the service is properly associated with the service network
- **Target Registration**: Verify that your ECS tasks are being registered as targets in the target group

## Additional Resources

- [VPC Lattice Documentation](https://docs.aws.amazon.com/vpc-lattice/latest/ug/what-is-vpc-service-network.html)
- [ECS and VPC Lattice Integration](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html)
- [VPC Lattice Security Best Practices](https://docs.aws.amazon.com/vpc-lattice/latest/ug/security-best-practices.html)

## Clean-up

After validating the VPC Lattice migration with the Frontend UI application connecting to the Products service through VPC Lattice, clean-up the resources deployed in this guide (and any other pre-requisites if you no longer need them), following steps [here](../appmesh-lattice-onboarding-files/clean-up-readme.md).
