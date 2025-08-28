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

Remove App Mesh components from product-taskdef.json and add health check for VPC Lattice:

```
# Edit the task definition to:

# 1. Remove the envoy container
# 2. Remove the xray-daemon container
# 3. Remove the dependsOn condition from the product container
# 4. Remove the proxyConfiguration section
# 5. Add a health check to the product container
# 6. Remove the environment variable APPMESH_VIRTUAL_NODE_NAME which is required by Appmesh
```

Here's an example of the updated task definition:

```json
{
  "family": "product-micro-service",
  "networkMode": "awsvpc",
  "executionRoleArn": "PRODUCT_TASK_EXECUTION_ROLE_ARN",
  "taskRoleArn": "<PRODUCT_TASK_ROLE_ARN>",
  "containerDefinitions": [
    {
      "name": "product-micro-service",
      "image": "<account-id>.dkr.ecr.us-west-2.amazonaws.com/product-ms:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 5000,
          "hostPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "5000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "<parameter-store-arn>"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/product-ms",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "product-ms"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "pgrep node || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ],
  "requiresCompatibilities": [
    "EC2"
  ],
  "cpu": "512",
  "memory": "1024"
}
```

Register the updated task definition:

```bash
aws ecs register-task-definition --cli-input-json file://product-taskdef.json --region us-west-2
```

## Step 2: Create a VPC Lattice Service Network

If you don't already have a service network, create one:

```bash
aws vpc-lattice create-service-network \
  --name test-inventory-network \
  --auth-type NONE \
  --region us-west-2
```

Note the service network ID from the output.

## Step 3: Associate your VPC used to launch ECS tasks, with the Lattice Service Network.

```bash
aws vpc-lattice create-service-network-vpc-association \
  --service-network-identifier <service-network-id> \
  --vpc-identifier <vpc-id> \
  --region us-west-2
```

Please wait for the VPC to get associated with service network. You can check the status with:

```bash
aws vpc-lattice get-service-network-vpc-association \
  --service-network-vpc-association-identifier <association-id> \
  --region us-west-2
```

## Step 4: Create a VPC Lattice Service

```bash
aws vpc-lattice create-service \
  --name product-ms-service \
  --auth-type NONE \
  --region us-west-2
```

Note the service ID from the output.

## Step 5: Associate the Service with the Service Network

```bash
aws vpc-lattice create-service-network-service-association \
  --service-network-identifier <service-network-id> \
  --service-identifier <service-id> \
  --region us-west-2
```

Wait for the association to complete. You can check the status with:

```bash
aws vpc-lattice get-service-network-service-association \
  --service-network-service-association-identifier <association-id> \
  --region us-west-2
```

## Step 6: Create a VPC Lattice Target Group

```bash
aws vpc-lattice create-target-group \
  --name product-ms-tg \
  --type IP \
  --config '{
    "port": 5000,
    "protocol": "HTTP",
    "vpcIdentifier": "<vpc-id>",
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
  --region us-west-2
```

Note the target group ID from the output.

## Step 7: Create a Listener for the Service

```bash
aws vpc-lattice create-listener \
  --service-identifier <service-id> \
  --name product-ms-listener \
  --protocol HTTP \
  --port 80 \
  --default-action '{"forward":{"targetGroups":[{"targetGroupIdentifier":"<target-group-id>"}]}}' \
  --region us-west-2
```

## Step 8: Update ECS task security group to allow VPC Lattice ingress.

Update Inbound rules of ECS task security group and add a rule to accept traffic from VPC Lattice prefix list `com.amazonaws.us-west-2.vpc-lattice (pl-0721453c7ac4ec009)` on port 5000 (product service).

## Step 9: Create a Lattice role for VPC lattice service.

# Create trust policy for ECS service
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

# Create the IAM role
```bash
aws iam create-role --role-name ECSVpcLatticeRole --assume-role-policy-document file://lattice-trust-policy.json
```

# Attach the VPC Lattice policy
```bash
aws iam attach-role-policy --role-name ECSVpcLatticeRole --policy-arn arn:aws:iam::aws:policy/AmazonECSInfrastructureRolePolicyForVpcLattice
```

## Step 10: Create a New ECS Service with VPC Lattice

- Instead of updating the existing App Mesh service, create a brand new service for a blue-green deployment scenario.
- Update the `product-lattice-service.json` file placeholders CLUSTER_NAME, SUBNET1/2/3, SECURITY_GROUP_ID, LATTICE_ROLE_ARN, and LATTICE_TARGET_GROUP_ARN, then create the ECS service:
      
```bash
aws ecs create-service \
  --cli-input-json file://product-service-lattice.json \
  --region us-west-2
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
     --target-group-identifier <target-group-id> \
     --region us-west-2
   ```

2. Test connectivity to your service through VPC Lattice:
   ```bash
   curl -v http://<vpc-lattice-service-domain>/api/products
   ```

## Step 13: Update Frontend application configuration to connect to product-ms service through VPC Lattice, instead of App Mesh.

- Update your frontend-ui task definition and replace the value of environment variable PRODUCTS_DOMAIN with VPC Lattice service domain instead of the App Mesh service domain.
- Update frontend-ui ECS service to use the latest task definition using below command and replace all the values enclosed in <>:

```bash
aws ecs update-service \
--cluster <CLUSTER> \
--service frontend-ui \
--task-definition frontend-ui:<REVISION> \
--region us-west-2
```

## Step 14: Verify the Migration

1. Test connectivity to your service through VPC Lattice:
   ```bash
   curl -v https://REPLACE_WITH_DNS_RECORD_FOR_PUBLIC_ALB/api/products
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
