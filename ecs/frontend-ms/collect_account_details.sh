#!/bin/bash

read -p "Enter the ALB production listener rule ARN, configured with B/G target groups: " LISTENER_RULE_ARN
echo "export LISTENER_RULE_ARN=$LISTENER_RULE_ARN" >> $GIT_BASE_DIR/account_details.sh
export LISTENER_RULE_ARN="$LISTENER_RULE_ARN"

read -p "Enter the ALB test listener rule ARN, configured with B/G target groups: " TEST_LISTENER_RULE_ARN
echo "export TEST_LISTENER_RULE_ARN=$TEST_LISTENER_RULE_ARN" >> $GIT_BASE_DIR/account_details.sh
export TEST_LISTENER_RULE_ARN="$TEST_LISTENER_RULE_ARN"

read -p "Enter the Blue target group mapped to the ALB listener rule: " BLUE_TARGET_GROUP_ARN
echo "export BLUE_TARGET_GROUP_ARN=$BLUE_TARGET_GROUP_ARN" >> $GIT_BASE_DIR/account_details.sh
export BLUE_TARGET_GROUP_ARN=$BLUE_TARGET_GROUP_ARN

read -p "Enter the Green target group mapped to the ALB listener rule: " GREEN_TARGET_GROUP_ARN
echo "export GREEN_TARGET_GROUP_ARN=$GREEN_TARGET_GROUP_ARN" >> $GIT_BASE_DIR/account_details.sh
export GREEN_TARGET_GROUP_ARN=$GREEN_TARGET_GROUP_ARN

read -p "Enter the DNS name you plan to use to access the ALB with B/G setup: " ALB_ENDPOINT
echo "export ALB_ENDPOINT=$ALB_ENDPOINT" >> $GIT_BASE_DIR/account_details.sh
export ALB_ENDPOINT=$ALB_ENDPOINT
