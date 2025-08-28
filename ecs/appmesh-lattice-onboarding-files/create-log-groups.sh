#!/bin/bash

# Create the required CloudWatch Log Groups
aws logs create-log-group --log-group-name "/ecs/product-ms" --region us-west-2
aws logs create-log-group --log-group-name "/ecs/product-ms-envoy" --region us-west-2
aws logs create-log-group --log-group-name "/ecs/product-ms-xray" --region us-west-2

# Optionally set retention period (e.g., 14 days) to manage costs
aws logs put-retention-policy --log-group-name "/ecs/product-ms" --retention-in-days 14 --region us-west-2
aws logs put-retention-policy --log-group-name "/ecs/product-ms-envoy" --retention-in-days 14 --region us-west-2
aws logs put-retention-policy --log-group-name "/ecs/product-ms-xray" --retention-in-days 14 --region us-west-2

echo "Log groups created successfully!"