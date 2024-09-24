# Polyglot Microservices Architecture using EKS and App Mesh

Reference Implementation to show how you can use AWS managed services like EKS, Fargate and App Mesh to build cloud native microservices architecture and use Cloudwatch and X-Ray to perform the monitoring and observability\.

![\[Image NOT FOUND\]](images/architecture.png)

**Topics**
  * [Prerequisite](#prerequisite)
  * [EKS](#eks)
  * [App Mesh](#app-mesh)
  * [Microservices Deployment](#microservices-deployment)
  * [Meshify Microservices](#meshify-microservices)
  * [Canary Deployment](#canary-deployment)
  * [Observability](#observability)

## Prerequisite
Before you start on this project, ensure you have all the prerequites mentioned in this section completed or installed. Below instructions are specified for Mac OS.

**Clone Git repo**

```bash
git clone https://github.com/aws-containers/eks-app-mesh-polyglot-demo.git
```

#### NOTE: Install `brew, jq, eksctl, kubectl` accroding to your Operating System. Below given commands are for MacOS.
**Install Brew**

```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
```

This script will install:

```bash
    /usr/local/bin/brew
    /usr/local/share/doc/homebrew
    /usr/local/share/man/man1/brew.1
    /usr/local/share/zsh/site-functions/_brew
    /usr/local/etc/bash_completion.d/brew
    /usr/local/Homebrew
```

**Install jq**

```bash
    brew install jq
```

**Install eksctl**

```bash
    brew install weaveworks/tap/eksctl

    >>>>>>>>>>
    ==> Installing eksctl from weaveworks/tap

    eksctl version                    
    
    >>>>>>>>>>
    0.176.0
```

**Install kubectl**

```bash
    curl -O https://s3.us-west-2.amazonaws.com/amazon-eks/1.30.2/2024-07-12/bin/darwin/amd64/kubectl

    chmod +x ./kubectl\n

    sudo mv ./kubectl /usr/local/bin\n

    ./kubectl version  --client

    >>>>>>>>>>
    Client Version: v1.30.2-eks-1552ad0
```
**Please validate and install docker if not installed**
```bash
    brew install docker
```

## EKS Cluster with Fargate Profile

**Create EKS Cluster**

This command will create VPC, Subnets, EKS Cluster, Managed NodeGroup, Fargate Profile, Cloudwatch logging for controle plane, OIDC Provider,  Service Account, IAM Role for Service Account, Namespace, kubeconfig setup
    
```bash
    export AWS_REGION=us-west-2
    export CLUSTER_NAME=eksctlappmesh2lattice
    export ACCOUNT_ID=<YOUR_ACCOUNT_ID_HERE>
    
    cat vpc-lattice-config/files/clusterconfig.yaml |envsubst| eksctl create cluster -f -
```

**Confirm the Nodegroup in the EKS cluster**

```bash
    kubectl get nodes 
```

**Go to Console and check the cluster information**  

  + You can see nodegroup and fargateprofile created in the EKS cluster

![\[Image NOT FOUND\]](images/eks-cluster.png)


![\[Image NOT FOUND\]](images/eks-worker.png)


## App Mesh

**Prerequisite**

  + Create IAM policy used by envoy

```bash    
aws iam create-policy \
    --policy-name ProdEnvoyNamespaceIAMPolicy \
    --policy-document file://eks-app-mesh-polyglot-demo/deployment/envoy-iam-policy.json
```
  + Update the Service Account to use ProdEnvoyNamespaceIAMPolicy policy

```bash
eksctl update iamserviceaccount --cluster $CLUSTER_NAME \
  --namespace prodcatalog-ns \
  --name prodcatalog-envoy-proxies \
  --attach-policy-arn arn:aws:iam::$ACCOUNT_ID:policy/ProdEnvoyNamespaceIAMPolicy \
  --approve
```

  + Ensure the below AppMesh policy is available in worker nodegroup role.(This policy will be added automatically to the role during cluster creation)
  
     ![\[Image NOT FOUND\]](images/appmeshpolicy.png)
  
  + Confirm if the namespace has service account and has the correct role. (This is created during cluster creation) 

```bash
    kubectl describe serviceaccount prodcatalog-envoy-proxies -n prodcatalog-ns  
```   

  + Check in the console for all the policies for this role. (This role with all the policies will be added during cluster creation)
  
     ![\[Image NOT FOUND\]](images/sa-role.png)
        
**Install App Mesh Helm Chart**

```bash
    helm repo add eks https://aws.github.io/eks-charts
    kubectl apply -k "https://github.com/aws/eks-charts/stable/appmesh-controller/crds?ref=master"    
```

**Confirm all the resources are created in the App Mesh**

```bash
    kubectl get crds | grep appmesh    
```

**Create App Mesh Namespace**

```bash
    kubectl create ns appmesh-system
```

**Create an IAM Role for the app mesh controller service account**

```bash
curl -o controller-iam-policy.json https://raw.githubusercontent.com/aws/aws-app-mesh-controller-for-k8s/master/config/iam/controller-iam-policy.json

aws iam create-policy \
    --policy-name AWSAppMeshK8sControllerIAMPolicy \
    --policy-document file://controller-iam-policy.json


eksctl create iamserviceaccount \
 --cluster ${CLUSTER_NAME} \
 --namespace appmesh-system \
 --name appmesh-controller \
 --attach-policy-arn  arn:aws:iam::$ACCOUNT_ID:policy/AWSAppMeshK8sControllerIAMPolicy \
 --override-existing-serviceaccounts \
 --approve
```

**Install App Mesh Controller into the appmesh-system namespace with X-Ray enabled**

```bash
helm upgrade -i appmesh-controller eks/appmesh-controller \
 --namespace appmesh-system \
 --set region=us-west-2 \
 --set serviceAccount.create=false \
 --set serviceAccount.name=appmesh-controller \
 --set tracing.enabled=true \
 --set tracing.provider=x-ray
```

**Confirm that the controller version is v1.0.0 or later.**

```bash
    kubectl get deployment appmesh-controller \
        -n appmesh-system \
        -o json  | jq -r ".spec.template.spec.containers[].image" | cut -f2 -d ':'
```

**Confirm all the resources are created in appmesh-system mamespace and pods are running**

```bash
    kubectl -n appmesh-system get all 
```

**Go to Console and check the App Mesh information**

![\[Image NOT FOUND\]](images/mesh.png)


## Microservices Deployment

![\[Image NOT FOUND\]](images/microservices.png)

**Login to ECR**

```bash
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.us-west-2.amazonaws.com 
```

**Build Backend Product Catalog (python) Service, Build Backend Product Detail (NodeJs) Service, Build Frontend (NodeJs) Service**
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

**Deploy the services to EKS**
```bash
    export APP_VERSION=1.0
    cat eks-app-mesh-polyglot-demo/deployment/base_app.yaml|envsubst| kubectl apply -f -
```

**Get the deployment details**
 + Product Catalog service is deployed into fargate pod
 + Frontend service and Product Detail service are deployed into nodegroup

```bash
    kubectl get deployment,pods,svc -n prodcatalog-ns -o wide
```

**Confirm if the fargate pod is using the Service Account role**
```bash
    kubectl describe pod -l app=frontend-node -n  prodcatalog-ns |egrep 'AWS_ROLE_ARN|AWS_WEB_IDENTITY_TOKEN_FILE|serviceaccount'
```

**Testing the Connectivity between Fargate and Nodegroup pods**
 + Bash into frontend pod container
 + curl to fargate prodcatalog backend and you should the response
 
```bash
    FE_POD=$(kubectl -n  prodcatalog-ns get pod -l app=frontend-node -o jsonpath='{.items[].metadata.name}')
    kubectl exec $FE_POD -n  prodcatalog-ns -it -- curl http://proddetail.prodcatalog-ns.svc.cluster.local:3000/catalogDetail
    
    >>>>>
    {"version":"1","vendors":["ABC.com"]}%

    kubectl exec $FE_POD -n  prodcatalog-ns -it -- curl http://prodcatalog.prodcatalog-ns.svc.cluster.local:5000/products/

    >>>>>
    {"products": {}, "details": {"version": "1", "vendors": ["ABC.com"]}}

```

## Meshify Microservices

You have seen the basic connectivity works between the services in both fargate and nodegroup. Lets add these services into App Mesh.

![\[Image NOT FOUND\]](images/meshify.png)

***Configure namespace with App Mesh Labels and deploy Mesh Object***

```bash
    kubectl apply -f vpc-lattice-config/files/namespace.yaml
    kubectl get namespace prodcatalog-ns --show-labels
    # output of next should show "True"
    kubectl get mesh prodcatalog-mesh -n prodcatalog-ns -o jsonpath='{.status.conditions[*].status}'
```

***Create all the App Mesh Resources for the services in the Mesh***

```bash
    kubectl apply -f eks-app-mesh-polyglot-demo/deployment/meshed_app.yaml
```

**Go to Console and check the App Mesh Resources information**

![\[Image NOT FOUND\]](images/mesh-1.png)

![\[Image NOT FOUND\]](images/mesh-2.png)

![\[Image NOT FOUND\]](images/mesh-3.png)


**Rolling restart the deployments**
```bash
for dep in prodcatalog proddetail frontend-node
  do
    kubectl -n prodcatalog-ns rollout restart deployment $dep
done
```
**Get the deployment details**
 + You should see 3 containers in each pod. 1. main service container 2. envoy 3. xray

```bash
    kubectl get deployment,pods,svc -n prodcatalog-ns

    kubectl get pods -n prodcatalog-ns
```

**Get all the containers from each pod**

```bash
    kubectl -n prodcatalog-ns get pods -o 'custom-columns=POD:.metadata.name,CONTAINER:.spec.containers[*].name' |egrep -i 'prodcatalog|proddetail|frontend-node|proddetail2'
```

**Testing the Connectivity between Fargate and Nodegroup pods via App Mesh**
 + Bash into frontend pod container
 + curl to fargate prodcatalog backend and you should the communication is going through envoy

```bash
    FE_POD=$(kubectl -n  prodcatalog-ns get pod -l app=frontend-node -o jsonpath='{.items[].metadata.name}')
    kubectl exec $FE_POD -n  prodcatalog-ns -it -- curl -v http://prodcatalog.prodcatalog-ns.svc.cluster.local:5000/products/ 2>&1|grep -v Expire
    


    >>>>>>>>
    Defaulted container "frontend-node" out of: frontend-node, envoy, xray-daemon, proxyinit (init)
    *   Trying 10.100.169.180...
    * TCP_NODELAY set
    * Connected to prodcatalog.prodcatalog-ns.svc.cluster.local (10.100.169.180) port 5000 (#0)
    > GET /products/ HTTP/1.1
    > Host: prodcatalog.prodcatalog-ns.svc.cluster.local:5000
    > User-Agent: curl/7.64.0
    > Accept: */*
    >
    < HTTP/1.1 200 OK
    < content-type: application/json
    < content-length: 70
    < access-control-allow-origin: *
    < server: envoy
    < date: Mon, 23 Sep 2024 23:53:33 GMT
    < x-envoy-upstream-service-time: 15
    <
    {"products": {}, "details": {"version": "1", "vendors": ["ABC.com"]}}
    * Connection #0 to host prodcatalog.prodcatalog-ns.svc.cluster.local left intact

```

**Adding App Mesh Virtual Gateway**

Now since we have verified the communication between nodegroup pod and fargate pod are good via envoy, lets expose the frontend service with App Mesh virtual gateway.

```bash
    kubectl apply -f eks-app-mesh-polyglot-demo/deployment/virtual_gateway.yaml
```

**Get service/ingress-gw in the namespace**
```bash
    kubectl get service/ingress-gw  -n prodcatalog-ns -o wide
```


**Check if the request to the Ingress Gateway is going from envoy**
```bash
    curl -v `kubectl get svc ingress-gw -n prodcatalog-ns -o jsonpath="{.status.loadBalancer.ingress[*].hostname}"`
    


    >>>>>>>>
    * Host af8bd3870c116493082f92d406750a85-4ba02b9840969abf.elb.us-west-2.amazonaws.com:80 was resolved.
    * IPv6: (none)
    * IPv4: 44.231.89.103, 52.35.164.164, 35.84.119.111
    *   Trying 44.231.89.103:80...
    * Connected to af8bd3870c116493082f92d406750a85-4ba02b9840969abf.elb.us-west-2.amazonaws.com (44.231.89.103) port 80
    > GET / HTTP/1.1
    > Host: af8bd3870c116493082f92d406750a85-4ba02b9840969abf.elb.us-west-2.amazonaws.com
    > User-Agent: curl/8.7.1
    > Accept: */*
    >
    * Request completely sent off
    < HTTP/1.1 200 OK
    < x-powered-by: Express
    < content-type: text/html; charset=utf-8
    < content-length: 1195
    < etag: W/"4ab-ju0cYuWnpkHio52kIUHS0XrmIdU"
    < date: Mon, 23 Sep 2024 23:57:23 GMT
    < x-envoy-upstream-service-time: 50
    < server: envoy

```

**If you get message something similar as below, give it few min, Ingress Gateway/LB will take a few min to deploy**

```bash
* Could not resolve host: af202a3281c2147c3a9d399f382973e7-8b13103ffbc2028b.elb.us-west-2.amazonaws.com
* Closing connection
curl: (6) Could not resolve host: af202a3281c2147c3a9d399f382973e7-8b13103ffbc2028b.elb.us-west-2.amazonaws.com

```

**Testing the App Mesh Deployment**

   + Get the Loadbalancer endpoint that Virtual Gateway is exposed
    
```bash
    kubectl get svc ingress-gw -n prodcatalog-ns -o jsonpath="{.status.loadBalancer.ingress[*].hostname}"  
```

+ Browse the Loadbalancer endpoint and you should see the frontend application loaded in your browser

    ![\[Image NOT FOUND\]](images/lbfrontend.png)

+ Add Product to Product Catalog, You should see the new product added in the Product Catalog table

    ![\[Image NOT FOUND\]](images/post1.png)

    ![\[Image NOT FOUND\]](images/post2.png)

## Canary Deployment
   + Now lets deploy a new version (version 2) of Product Detail backend service 
   + And change the ProdDetail Virtual Router to route traffic 50% to version 1 and 50% to version 2

   ![\[Image NOT FOUND\]](images/canary1.png)

**Build and Push the changes as version 2 docker image**

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
**Deploy the new service and mesh resources for version 2 service**
```bash
    cat eks-app-mesh-polyglot-demo/deployment/canary.yaml|envsubst|kubectl apply -f -
```

**Check the resources for service version 2**

```bash
    kubectl get all  -n prodcatalog-ns -l app=proddetail2
    kubectl get virtualnode,virtualrouter -n prodcatalog-ns    
```

**Test the Canary Deployment**

+ Go to the Load Balance URL, you should see below screen which shows that Catalog Detail is accessing Version 1

    ![\[Image NOT FOUND\]](images/lbfrontend.png)

+ Now click on the button "Click to see Canary" (may be couple of times), you should see call to version 2 Catalog Detail service

     ![\[Image NOT FOUND\]](images/canary.png)
