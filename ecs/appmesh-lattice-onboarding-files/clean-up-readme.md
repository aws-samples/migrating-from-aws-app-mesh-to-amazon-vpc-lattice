# Clean-up resources

This guide provides step-by-step instructions to clean-up resources explicitly created to test the migration.

## Step 1: Clean up ECS services

```bash
aws ecs delete-service \
  --cluster <CLUSTER_NAME> \
  --service product-service \
  --force \
  --region us-west-2

aws ecs delete-service \
  --cluster <CLUSTER_NAME> \
  --service product-lattice-service \
  --force \
  --region us-west-2

aws ecs delete-service \
  --cluster <CLUSTER_NAME> \
  --service frontend-ui \
  --force \
  --region us-west-2
```

## Step 2: Clean up CloudWatch log groups

```bash
aws logs delete-log-group --log-group-name "/ecs/frontend-ui" --region us-west-2
aws logs delete-log-group --log-group-name "/ecs/frontend-ui-xray" --region us-west-2
aws logs delete-log-group --log-group-name "/ecs/product-ms" --region us-west-2
aws logs delete-log-group --log-group-name "/ecs/product-ms-envoy" --region us-west-2
aws logs delete-log-group --log-group-name "/ecs/product-ms-xray" --region us-west-2
```

## Step 3: Clean up App Mesh Resources

```bash
# Delete virtual service
aws appmesh delete-virtual-service \
  --mesh-name inventory-mesh \
  --virtual-service-name product-ms.inventory-mesh.local \
  --region us-west-2

# Delete virtual node
aws appmesh delete-virtual-node \
  --mesh-name inventory-mesh \
  --virtual-node-name product-ms-vn \
  --region us-west-2

# Delete Service Discovery Service (in Cloud Map namespace)

aws servicediscovery delete-service --id <service-id> --region us-west-2

# Delete Cloud Map namespace

aws servicediscovery delete-namespace --id <namespace-id> --region us-west-2

# Delete mesh in App Mesh

aws appmesh delete-mesh --mesh-name inventory-mesh --region us-west-2
```

## Step 4: Clean up VPC Lattice resources

```bash
# Delete Lattice Service association with Service Network

aws vpc-lattice delete-service-network-service-association \
  --service-network-service-association-identifier <association-id> \
  --region us-west-2

# Delete Lattice Service

aws vpc-lattice delete-service --service-identifier <service-id> --region us-west-2

# Delete Lattice Target Group

aws vpc-lattice delete-target-group --target-group-identifier <target-group-id> --region us-west-2

# Delete VPC association with Service Network

aws vpc-lattice delete-service-network-vpc-association \
  --service-network-vpc-association-identifier <association-id> \
  --region us-west-2

# Delete VPC Lattice Service Network

aws vpc-lattice delete-service-network \
  --service-network-identifier <service-network-id> --region us-west-2
```

## Step 5: Clean up ECR repos

```bash
aws ecr delete-repository --repository-name order-ms --force --region us-west-2
aws ecr delete-repository --repository-name user-ms --force --region us-west-2
aws ecr delete-repository --repository-name product-ms --force --region us-west-2
aws ecr delete-repository --repository-name frontend-ui --force --region us-west-2
```

## Step 6: Clean up database artifacts used by the application

* Connect to the database and run below queries to clean-up the tables and other associated artifacts.

```bash
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP FUNCTION IF EXISTS update_order_total CASCADE;
```

## Other resource clean up

* The documentation listed several resources as pre-requisites that our ECS users may have already deployed in their accounts. If you deployed new resources just for this migration exercise, please clean them up.

```bash
Amazon Aurora Serverless - PostgreSQL database
Systems Manager Parameter Store parameter for database connection string
ALB
ALB Target Group
IAM Roles for VPC Lattice, ECS Task and ECS Task Execution
ECS cluster with EC2 instances
Amazon VPC
```
