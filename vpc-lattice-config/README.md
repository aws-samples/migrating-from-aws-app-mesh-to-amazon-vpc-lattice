## Amazon VPC lattice Configuration files

This folder contains sample HttpRoute and TargetGroupPolicy for the migration of polyglot application leveraging AppMesh to Amazon VPC lattice.


#### NOTE: These steps are to build a NEW namespace, deploy the app and configure it to use Amazon VPC lattice.


- **If you want to do the In-Place migration, without building a new namespace and re-deployment of infra. please [follow these steps](In-place-migration-steps.md)**


**Step 1: ###Optional### - Only required, if you don't already have the repositories cloned. Git clone 2 required repositories to your local workspace with following commands:**

###### *Note: We are intentionally cloning the second repository inside the first one.*
```bash
    cd ~
    git clone https://github.com/aws-samples/migrating-from-aws-app-mesh-to-amazon-vpc-lattice.git
    cd migrating-from-aws-app-mesh-to-amazon-vpc-lattice
    git clone https://github.com/aws-containers/eks-app-mesh-polyglot-demo
```

###### PreRequisite
**Step 2: Check if AWS_REGION, ACCOUNT_ID and, CLUSTER_NAME are set correctly**

```bash
    test -n "$AWS_REGION" && echo AWS_REGION is "$AWS_REGION" || echo AWS_REGION is not set
    test -n "$ACCOUNT_ID" && echo ACCOUNT_ID is "$ACCOUNT_ID" || echo ACCOUNT_ID is not set
    test -n "$CLUSTER_NAME" && echo CLUSTER_NAME is "$CLUSTER_NAME" || echo CLUSTER_NAME is not set
```

* If not, export the AWS_REGION, ACCOUNT_ID and, CLUSTER_NAME to ENV

```bash 
    export ACCOUNT_ID=<your_account_id>
    export AWS_REGION=<your_aws_region>
    export CLUSTER_NAME=<your_eks_cluster_name>
```


**Step 3: ###Optional### - Only required, if you don't already have ECR and images. login to registery**

```bash
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
```

**Step 4: ###Optional### - Only required, if you don't already have ECR and images. Create, Validate and push images to ECR.**

```bash
    PROJECT_NAME=eks-app-mesh-to-vpc-lattice
    export APP_VERSION=1.0
    cd eks-app-mesh-polyglot-demo
    for app in catalog_detail product_catalog frontend_node; 
        do
            aws ecr describe-repositories --repository-name $PROJECT_NAME/$app >/dev/null 2>&1 || \
            aws ecr create-repository --repository-name $PROJECT_NAME/$app >/dev/null
            TARGET=${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/$PROJECT_NAME/$app:$APP_VERSION
            docker buildx build --platform linux/amd64 -t $TARGET apps/$app
            docker push $TARGET
    done; cd ..
```

**Step 5: ###Optional### - Only required, if you don't already have Allowed traffic from Amazon VPC lattice.**

```bash
    CLUSTER_SG=$(aws eks describe-cluster --name $CLUSTER_NAME --output json| jq -r '.cluster.resourcesVpcConfig.clusterSecurityGroupId')

    PREFIX_LIST_ID=$(aws ec2 describe-managed-prefix-lists --query "PrefixLists[?PrefixListName=="\'com.amazonaws.$AWS_REGION.vpc-lattice\'"].PrefixListId" | jq -r '.[]')

    aws ec2 authorize-security-group-ingress --group-id $CLUSTER_SG --ip-permissions "PrefixListIds=[{PrefixListId=${PREFIX_LIST_ID}}],IpProtocol=-1"

    PREFIX_LIST_ID_IPV6=$(aws ec2 describe-managed-prefix-lists --query "PrefixLists[?PrefixListName=="\'com.amazonaws.$AWS_REGION.ipv6.vpc-lattice\'"].PrefixListId" | jq -r '.[]')

    aws ec2 authorize-security-group-ingress --group-id $CLUSTER_SG --ip-permissions "PrefixListIds=[{PrefixListId=${PREFIX_LIST_ID_IPV6}}],IpProtocol=-1"
```

**Setp 6: ###Optional### - Only required, if you don't already have Setup IAM policy for Amazon VPC lattice Controller**

```bash
    curl https://raw.githubusercontent.com/aws/aws-application-networking-k8s/main/files/controller-installation/recommended-inline-policy.json  -o vpc-lattice-config/files/recommended-inline-policy.json

    aws iam create-policy \
       --policy-name VPCLatticeControllerIAMPolicy \
        --policy-document file://vpc-lattice-config/files/recommended-inline-policy.json

    export VPCLatticeControllerIAMPolicyArn=$(aws iam list-policies --query 'Policies[?PolicyName==`VPCLatticeControllerIAMPolicy`].Arn' --output text)
```

**Step 7: Create a Namespace named aws-application-networking-system. it comes with label control-plane: gateway-api-controller**

```bash
    kubectl get ns |grep -q ^aws-application-networking-system || kubectl apply -f https://raw.githubusercontent.com/aws/aws-application-networking-k8s/main/files/controller-installation/deploy-namesystem.yaml
```

**Step 8: ###Optional### - Only required, if you don't already have it, please [set up the Amazon EKS Pod Identity Agent](https://docs.aws.amazon.com/eks/latest/userguide/pod-id-agent-setup.html). Confirm that the EKS Pod Identity Agent pods are running on your cluster.**
    
```bash
    aws eks create-addon --cluster-name $CLUSTER_NAME --addon-name eks-pod-identity-agent
    sleep 30
    kubectl get pods -n kube-system | grep 'eks-pod-identity-agent'
```

**Step 9: ###Optional### - Only required, if you don't already have a service account for PodIdentity to be used by gateway-api-controller-service-account.**

```bash
    kubectl apply -f ./vpc-lattice-config/files/gateway-api-controller-service-account.yaml
```

**Step 10: Create the Namespace and a Service account in the namespace for PodIdentity. This account will be used by our application. let's make sure new Namespace doesn't have mesh related labels**

```bash
    export oldns_name=prodcatalog-ns
	export newns_name=prodcatalog-ns-lattice
	alias oldns_cmd='sed "s/$newns_name/$oldns_name/g"'
    kubectl apply -f ./vpc-lattice-config/files/lattice-pod-service-account.yaml
    kubectl label ns $newns_name --overwrite {mesh-,gateway-,appmesh.k8s.aws/sidecarInjectorWebhook-}
```

**Step 11: ###Optional### - Only required, if you don't already have it. Create a role with trust relationship policy for Amazon VPC lattice Controller.**

```bash
    aws iam create-role --role-name VPCLatticeControllerIAMRole \
       --assume-role-policy-document file://vpc-lattice-config/files/trust-relationship.json \
       --description "IAM Role for AWS Gateway API Controller for Amazon VPC lattice"

    export VPCLatticeControllerIAMRoleArn=$(aws iam list-roles --query 'Roles[?RoleName==`VPCLatticeControllerIAMRole`].Arn' --output text)
    
    export VPCLatticeControllerIAMPolicyArn=$(aws iam list-policies --query 'Policies[?PolicyName==`VPCLatticeControllerIAMPolicy`].Arn' --output text)
    
    aws iam attach-role-policy --role-name VPCLatticeControllerIAMRole --policy-arn=$VPCLatticeControllerIAMPolicyArn
```

**Step 12: Create a role with trust relationship policy for Service Account to use in PODs.**

```bash
    aws iam create-policy --policy-name VPCLatticeIAMPolicyForProdcatalog \
    --policy-document file://vpc-lattice-config/files/lattice-pod-service-account-policy.yaml

    aws iam create-role --role-name VPCLatticeIAMRoleForProdcatalog \
    --assume-role-policy-document file://vpc-lattice-config/files/trust-relationship.json \
    --description "IAM Role for service account prodcatalog-lattice-sa"

    export VPCLatticeIAMPolicyForProdcatalogArn=$(aws iam list-policies --query 'Policies[?PolicyName==`VPCLatticeIAMPolicyForProdcatalog`].Arn' --output text)

    aws iam attach-role-policy --role-name VPCLatticeIAMRoleForProdcatalog --policy-arn=$VPCLatticeIAMPolicyForProdcatalogArn

    export VPCLatticeProdcatalogIAMRoleArn=$(aws iam list-roles --query 'Roles[?RoleName==`VPCLatticeIAMRoleForProdcatalog`].Arn' --output text)
```

**Step 13: Create the pod identity association with Amazon VPC lattice Controller Service Account.**

```bash
    aws eks create-pod-identity-association --cluster-name $CLUSTER_NAME --role-arn $VPCLatticeControllerIAMRoleArn --namespace aws-application-networking-system --service-account gateway-api-controller
```

**Step 14:  Create the pod identity association with Service Account.**

```bash
    aws eks create-pod-identity-association --cluster-name $CLUSTER_NAME --role-arn $VPCLatticeProdcatalogIAMRoleArn --namespace $newns_name --service-account prodcatalog-lattice-sa
```

**Step 15: let's deploy the application in new namespace.**

```bash
    envsubst < ./vpc-lattice-config/files/base_app.yaml | kubectl apply -f -
```

**Step 16: ###Optional### -Only required, if you don't already have gateway-api-controller running. Login to get helm chat from ECR and install gateway controller.**

```bash
    aws ecr-public get-login-password --region us-east-1 | helm registry login --username AWS --password-stdin public.ecr.aws

    # set lacttice controller version
    export LATTICE_CONTROLLER_VERSION=1.0.6
    export defaultServiceNetwork=product-catalog-lattice-gw

    # install gateway controller
    helm install gateway-api-controller \
        oci://public.ecr.aws/aws-application-networking-k8s/aws-gateway-controller-chart \
        --version=v${LATTICE_CONTROLLER_VERSION} \
        --set=aws.region=${AWS_REGION} \
        --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="$VPCLatticeControllerIAMRoleArn" \
        --set=defaultServiceNetwork=${defaultServiceNetwork} \
        --namespace aws-application-networking-system \
        --wait
```

**Step 17: Check the status of the pods for lattice gateway-api-controller**

```bash
    kubectl --namespace aws-application-networking-system get pods -l "app.kubernetes.io/instance=gateway-api-controller"
```

**Step 18: ###Optional### -Only required, if you don't already have GatewayClass created. Create the `amazon-vpc-lattice` GatewayClass**

```bash
    kubectl apply -f https://raw.githubusercontent.com/aws/aws-application-networking-k8s/main/files/controller-installation/gatewayclass.yaml
```

**Step 19: Create the kubernetes gateway**

```bash
    kubectl apply -f ./vpc-lattice-config/files/product-catalog-gateway.yaml
    kubectl wait --for=condition=Programmed gateway/product-catalog-lattice-gw -n $newns_name

    #Validate the gateway is created and 'PROGRAMMED' is set to 'True'
    kubectl get gateway -n $newns_name
    # see the status details and reason. if you see a network in reason, it is PROGRAMMED correctly.
    kubectl get gateway -n $newns_name -o jsonpath='{"Status: "}{.items[*].status.conditions[1].reason}{", "}{"Reason_or_DNS_Name: "}{.items[*].status.conditions[1].message}{"\n"}'
```

**Step 20: Create a TargetGroupPolicy that tells Lattice how to properly perform health checks on our services.**

```bash
    kubectl apply -f ./vpc-lattice-config/files/proddetail-TargetGroupPolicy-proddetail-v1.yaml
    kubectl apply -f ./vpc-lattice-config/files/prodcatalog-TargetGroupPolicy.yaml
    kubectl apply -f ./vpc-lattice-config/files/frontend-node-TargetGroupPolicy.yaml
```

**Step 21: Create the HTTPRoutes to distributes 100% traffic to proddetail_v1**

```bash
    kubectl apply -f ./vpc-lattice-config/files/proddetail-HTTPRoute.yaml
    kubectl apply -f ./vpc-lattice-config/files/prodcatalog-HTTPRoute.yaml
    kubectl apply -f ./vpc-lattice-config/files/frontend-node-HTTPRoute.yaml
```

**Step 22: Test connectivity using Amazon VPC lattice endpoints.**

```bash
    # Find URL for "proddetail" service created by httproute
    echo 'sleep 60; let vpc lattice assign domain names'
    sleep 60
    export GET_PRODDETAIL_URL=$(kubectl get -n $newns_name httproute proddetail-httproute -o jsonpath='{.metadata.annotations.application-networking\.k8s\.aws/lattice-assigned-domain-name}')

    # find the pod name in 'prodcatalog'
    export GET_CATALOG_POD_NAME=$(kubectl get pods -n $newns_name -l app=prodcatalog -o jsonpath='{.items[].metadata.name}')

    # try connecting from 'prodcatalog' to 'proddetail', use output from prvious command to replace 'GET_PRODDETAIL_URL'
    export CHECK_CONN_CATLOG_TO_PRODDETAIL=$(echo "kubectl -n $newns_name exec -it ${GET_CATALOG_POD_NAME} -c prodcatalog -- curl ${GET_PRODDETAIL_URL}:3000/catalogDetail 2>&1|jq -s") 

    # Find URL for "prodcatalog" service created by httproute
    export GET_CATALOG_URL=$(kubectl get -n $newns_name httproute prodcatalog-httproute -o jsonpath='{.metadata.annotations.application-networking\.k8s\.aws/lattice-assigned-domain-name}')

    # get inside "frontend-node" container and see if it can get data "prodcatalog" AppMesh service
    export GET_FRONTEND_POD_NAME=$(kubectl get pods -n $newns_name -l app=frontend-node -o jsonpath='{.items[].metadata.name}')

    # try connecting from 'frontend-node' to 'prodcatalog', use output from prvious command to replace 'GET_CATALOG_URL'
    export CHECK_CONN_FRONTEND_TO_CATALOG=$(echo "kubectl -n $newns_name exec -it ${GET_FRONTEND_POD_NAME} -c frontend-node -- curl ${GET_CATALOG_URL}:5000/products/ 2>&1|jq -s") 

```

**Step 23: Validate you have GET_CATALOG_URL and GET_PRODDETAIL_URL variables set. if not, please follow Setep 22**

```bash
    if [ -z $GET_CATALOG_URL ] ||  [[ -z $GET_PRODDETAIL_URL ]]; then
        test -n "$GET_CATALOG_URL" && echo GET_CATALOG_URL is "$GET_CATALOG_URL" || echo GET_CATALOG_URL is not set
        test -n "$GET_PRODDETAIL_URL" && echo GET_PRODDETAIL_URL is "$GET_PRODDETAIL_URL" || echo GET_PRODDETAIL_URL is not set
        test -n "$AWS_REGION" && echo AWS_REGION is "$AWS_REGION" || echo AWS_REGION is not set
        test -n "$ACCOUNT_ID" && echo ACCOUNT_ID is "$ACCOUNT_ID" || echo ACCOUNT_ID is not set
        echo -e "Please set the variables as shown in Step 21 and re-try \n"
    else
        echo "executing the command to test connection from 'prodcatalog' to 'proddetail' using Amazon VPC lattice endponts."; echo
        eval $CHECK_CONN_CATLOG_TO_PRODDETAIL;
        echo -e "-----------------------------------------------\n"
        echo "executing the command to test connection from 'frontend-node' to 'prodcatalog' using Amazon VPC lattice endponts."; echo
        eval $CHECK_CONN_FRONTEND_TO_CATALOG
        echo -e "-----------------------------------------------\n"
        echo "compare both outputs"
        eval $CHECK_CONN_FRONTEND_TO_CATALOG; echo -e '-----------\n';eval $CHECK_CONN_CATLOG_TO_PRODDETAIL
    fi
```

**Step 24: configure application to work using Amazon VPC lattice endponts.**

```bash
    echo "update 'frontend' pod to use '$GET_CATALOG_URL' and 'prodcatalog' to use '$GET_PRODDETAIL_URL'"
    sed -e "s/prodcatalog.$newns_name.svc.cluster.local/$GET_CATALOG_URL/g" -e "s/proddetail.$newns_name.svc.cluster.local/$GET_PRODDETAIL_URL/g" ./vpc-lattice-config/files/base_app.yaml |envsubst | kubectl apply -f -
```

**Step 25: check if you can connect. We are using kubectl port-forward to access the frontend**

```bash
    kubectl -n $newns_name port-forward svc/frontend-node 8443:9000
    # alternatively you can deploy an LB and test app on this LB too.
    envsubst <vpc-lattice-config/files/lattice-nlb.yaml|kubectl apply -f -
    sleep 30
    curl `kubectl get -n $newns_name svc/frontend-node-lb -o jsonpath='{.status.loadBalancer.ingress[].hostname}'`
```

**Step 26: login to registery. Create, Validate and push catalog_detail v2 image to ECR**
```bash
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
    PROJECT_NAME=eks-app-mesh-to-vpc-lattice
    export APP_VERSION_2=2.0
    cd eks-app-mesh-polyglot-demo
    for app in catalog_detail; do
    aws ecr describe-repositories --repository-name $PROJECT_NAME/$app >/dev/null 2>&1 || \
    aws ecr create-repository --repository-name $PROJECT_NAME/$app >/dev/null
    TARGET=$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME/$app:$APP_VERSION_2
    cd apps/$app
    docker buildx build --platform linux/amd64 -t $TARGET -f version2/Dockerfile .
    docker push $TARGET
    done
    cd ../../..
```

**Step 27: Deploy v2 of the app, Create a TargetGroupPolicy and HTTPRoutes to distributes 50% traffic to proddetail_v1 and 50% to proddetail_v2**

```bash
    envsubst < ./vpc-lattice-config/files/canary.yaml | kubectl apply -f -
```

**Step 28: Set variable to V2 and test traffic again using commands from Step 22 and check frontend using step 23.**

```bash
    export GET_PRODDETAIL_URL=$(kubectl get -n $newns_name httproute proddetail-httproute -o jsonpath='{.metadata.annotations.application-networking\.k8s\.aws/lattice-assigned-domain-name}')
```
-------
**Step 29: Cleanup for EKS infrastructure**
Once you have a solid understanding of the process and are satisfied with your testing on the EKS cluster created as part of the [AppMesh-Install-README.md](AppMesh-Install-README.md) steps, be sure to delete the resources to avoid future charges. You can do this by following the cleanup section of the EKS Blueprints pattern or by executing the following comamnd:

```bash
bash vpc-lattice-config/files/latticeblogcleanup.sh
```

### Conclusion:
+ By following the steps outlined in this guide, you can seamlessly transition your microservices architecture while maintaining service reliability and improving operational efficiency. 
+ Migrating from AWS App Mesh to Amazon VPC Lattice provides a robust solution for managing application networking at scale, offering enhanced connectivity, load balancing, and security features. 
+ Be sure to explore the repository for more advanced use cases mentioned in [README.md](../README.md)
+ Remember to clean up any resources once you're done testing to avoid unnecessary charges.
+ Please refer back to the blog using [this](link_to_be_added_here) link.
