#!/bin/bash

# Create the required CloudWatch Log Groups
aws logs create-log-group --log-group-name "/ecs/frontend-ui" --region us-west-2
aws logs create-log-group --log-group-name "/ecs/frontend-ui-xray" --region us-west-2

# Optionally set retention period (e.g., 14 days) to manage costs
aws logs put-retention-policy --log-group-name "/ecs/frontend-ui" --retention-in-days 14 --region us-west-2
aws logs put-retention-policy --log-group-name "/ecs/frontend-ui-xray" --retention-in-days 14 --region us-west-2

echo "Log groups created successfully!"
