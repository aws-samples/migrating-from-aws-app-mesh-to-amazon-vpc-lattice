# Infrastructure

This folder contains the CloudFormation template and resources for deploying the ECS App Mesh to VPC Lattice migration demo.

## Contents

- `ecs-appmesh-migration-cfn.yaml` - Complete CloudFormation template for the infrastructure


## CloudFormation Template

The `ecs-appmesh-migration-cfn.yaml` template creates a complete infrastructure stack including:

### Networking
- VPC with public and private subnets across 3 AZs
- Internet Gateway and NAT Gateway
- Route tables and security groups

### Database
- Aurora PostgreSQL Serverless v2 cluster
- Database credentials stored in AWS Secrets Manager
- Connection string stored in Secrets Manager

### Container Infrastructure
- ECS Cluster with EC2 capacity provider
- Auto Scaling Group for ECS instances
- ECR repositories for all microservices

### App Mesh Resources
- Service mesh with virtual nodes and services
- AWS Cloud Map namespace for service discovery
- Virtual nodes for product, order, and user services

### Load Balancing
- Application Load Balancer for frontend access
- Target groups and listeners

### IAM Roles
- ECS task execution and task roles
- VPC Lattice integration role
- EC2 instance roles

### Logging
- CloudWatch Log Groups for all services
- Separate log groups for application, Envoy, and X-Ray containers

## Deployment

### Prerequisites
- AWS CLI configured with appropriate permissions
- Docker installed for building container images

### Deploy the Stack

```bash
# Deploy the CloudFormation stack
aws cloudformation create-stack \
  --stack-name appmesh-lattice-demo \
  --template-body file://ecs-appmesh-migration-cfn.yaml \
  --capabilities CAPABILITY_IAM \
  --region us-west-2
```

### Monitor Deployment

```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name appmesh-lattice-demo \
  --query 'Stacks[0].StackStatus'
```

### Get Stack Outputs

```bash
# Get important outputs
aws cloudformation describe-stacks \
  --stack-name appmesh-lattice-demo \
  --query 'Stacks[0].Outputs'
```

## Post-Deployment Steps

1. **Build and push container images** to the created ECR repositories
2. **Update database connection string** in Secrets Manager if needed
3. **Deploy ECS services** using the created task definitions
4. **Configure VPC Lattice** resources for migration testing

## Key Resources Created

| Resource Type | Purpose |
|---------------|---------|
| VPC | Network isolation with public/private subnets |
| Aurora Serverless | PostgreSQL database for microservices |
| ECS Cluster | Container orchestration platform |
| App Mesh | Service mesh for traffic management |
| ALB | Load balancer for frontend access |
| ECR | Container image repositories |
| CloudWatch | Logging and monitoring |

## Security Groups

- **ALB Security Group**: Allows HTTP/HTTPS from internet
- **ECS Security Group**: Allows traffic from ALB and within VPC
- **Database Security Group**: Allows PostgreSQL access from VPC

## Cleanup

```bash
# Delete the stack (WARNING: This will delete all resources)
aws cloudformation delete-stack \
  --stack-name appmesh-lattice-demo
```

## Notes

- This template is designed for demo/testing purposes
- Not recommended for production use without additional security hardening
- Costs will be incurred for running resources (EC2, Aurora, NAT Gateway, etc.)
- The template includes Aurora Serverless v2 which scales based on usage