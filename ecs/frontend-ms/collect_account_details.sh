#!/bin/bash

read -p "Enter the ALB listener rule ARN, configured with B/G target groups: " LISTENER_RULE_ARN
echo "export LISTENER_RULE_ARN=$LISTENER_RULE_ARN" >> $GIT_BASE_DIR/account_details.sh
export LISTENER_RULE_ARN="$LISTENER_RULE_ARN"

read -p "Enter the Blue target group mapped to the ALB listener rule: " BLUE_TARGET_GROUP_ARN
echo "export BLUE_TARGET_GROUP_ARN=$BLUE_TARGET_GROUP_ARN" >> $GIT_BASE_DIR/account_details.sh
export BLUE_TARGET_GROUP_ARN=$BLUE_TARGET_GROUP_ARN

read -p "Enter the Green target group mapped to the ALB listener rule: " GREEN_TARGET_GROUP_ARN
echo "export GREEN_TARGET_GROUP_ARN=$GREEN_TARGET_GROUP_ARN" >> $GIT_BASE_DIR/account_details.sh
export GREEN_TARGET_GROUP_ARN=$GREEN_TARGET_GROUP_ARN