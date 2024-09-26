### In-Place migration steps - Replace AppMesh with Amazon VPC lattice. 

**Note1: These steps differ from main [README.md](README.md) file, which is focused on building a differnt namespace to deploy app.**
-------
**Note2: We assume you have completed the steps in [AppMesh-Install-README.md](AppMesh-Install-README.md) before proceeding.**
------
#
**Step 1: Export the variables and start following after completeing 9 steps from [README.md](README.md) file.**

```bash
	export oldns_name=prodcatalog-ns
	export newns_name=prodcatalog-ns-lattice
	alias oldns_cmd='sed "s/$newns_name/$oldns_name/g"'
```

**Step 2: Step 10 from main [README.md](README.md) file: use old namespace to create service account**

```bash
	oldns_cmd ./vpc-lattice-config/files/lattice-pod-service-account.yaml|envsubst|kubectl apply -f -
```

**Step 3: Continue to follow step 11 to 13 from main [README.md](README.md) file**

**Step 4: Step 14 from main [README.md](README.md) file: use old namespace to create pod identity association**

```bash
	aws eks create-pod-identity-association --cluster-name $CLUSTER_NAME --role-arn $VPCLatticeProdcatalogIAMRoleArn --namespace $oldns_name --service-account prodcatalog-lattice-sa
```

**Step 5: Step 15 from main [README.md](README.md) file: (***SKIP***) not changing the namespace, so no need to redeploy the app.**
	### Remember: service-account needs to be updated.###
	### We'll do it at the end to make sure we have service working
	### oldns_cmd ./vpc-lattice-config/files/base_app.yaml|envsubst|kubectl apply -f -

**Step 6: Continue to follow step 16 to 18 from main [README.md](README.md) file**

**Step 7: Step 19 from main [README.md](README.md) file: use old namespace name to create gateway**

```bash
	oldns_cmd ./vpc-lattice-config/files/product-catalog-gateway.yaml|envsubst|kubectl apply -f -
	kubectl wait --for=condition=Programmed gateway/product-catalog-lattice-gw -n $oldns_name
	kubectl get gateway -n $oldns_name
	kubectl get gateway -n $oldns_name -o jsonpath='{"Status: "}{.items[*].status.conditions[1].reason}{", "}{"Reason_or_DNS_Name: "}{.items[*].status.conditions[1].message}{"\n"}'
```

**Step 8: Step 20 + 21 from main [README.md](README.md) file: use old namespace name to Create TargetGroupPolicy**

```bash
	for file in proddetail-TargetGroupPolicy-proddetail-v1 prodcatalog-TargetGroupPolicy frontend-node-TargetGroupPolicy proddetail-HTTPRoute prodcatalog-HTTPRoute frontend-node-HTTPRoute
	  do
		oldns_cmd ./vpc-lattice-config/files/$file.yaml |envsubst |kubectl apply -f -
	done
```

**Step 9: Step 22 from main [README.md](README.md) file: use old namespace name to test connectivity using Amazon VPC lattice endpoints.**
	### NOTE: It will fail because of ### Known issue https://github.com/istio/istio/issues/2833 ### Envoy 404 when receiving request with unknown hostname	

```bash
	echo 'sleep 60; let VPC Lattice service assign domain names to our httproutes'
	sleep 60
    export GET_PRODDETAIL_URL=$(kubectl get -n $oldns_name httproute proddetail-httproute -o jsonpath='{.metadata.annotations.application-networking\.k8s\.aws/lattice-assigned-domain-name}')

    # find the pod name in 'prodcatalog'
    export GET_CATALOG_POD_NAME=$(kubectl get pods -n $oldns_name -l app=prodcatalog -o jsonpath='{.items[].metadata.name}')

    # try connecting from 'prodcatalog' to 'proddetail', use output from prvious command to replace 'GET_PRODDETAIL_URL'
    export CHECK_CONN_CATLOG_TO_PRODDETAIL=$(echo "kubectl -n $oldns_name exec -it ${GET_CATALOG_POD_NAME} -c prodcatalog -- curl ${GET_PRODDETAIL_URL}:3000/catalogDetail 2>&1|jq -s") 

    # Find URL for "prodcatalog" service created by httproute
    export GET_CATALOG_URL=$(kubectl get -n $oldns_name httproute prodcatalog-httproute -o jsonpath='{.metadata.annotations.application-networking\.k8s\.aws/lattice-assigned-domain-name}')

    # get inside "frontend-node" container and see if it can get data "prodcatalog" AppMesh service
    export GET_FRONTEND_POD_NAME=$(kubectl get pods -n $oldns_name -l app=frontend-node -o jsonpath='{.items[].metadata.name}')

    # try connecting from 'frontend-node' to 'prodcatalog', use output from prvious command to replace 'GET_CATALOG_URL'
    export CHECK_CONN_FRONTEND_TO_CATALOG=$(echo "kubectl -n $oldns_name exec -it ${GET_FRONTEND_POD_NAME} -c frontend-node -- curl ${GET_CATALOG_URL}:5000/products/ 2>&1|jq -s") 
```

**Step 10: Step 23 from main [README.md](README.md) file: use old namespace name to test connectivity using Amazon VPC lattice endpoints. Validate you have GET_CATALOG_URL and GET_PRODDETAIL_URL variables set. if not, please follow Step 9: Step 22 from main [README.md](README.md) file.**
	### ###NOTE:  It will fail because of ### Known issue https://github.com/istio/istio/issues/2833 ### Envoy 404 when receiving request with unknown hostname	

```bash
    if [ -z $GET_CATALOG_URL ] ||  [[ -z $GET_PRODDETAIL_URL ]]; then
        test -n "$GET_CATALOG_URL" && echo GET_CATALOG_URL is "$GET_CATALOG_URL" || echo GET_CATALOG_URL is not set
        test -n "$GET_PRODDETAIL_URL" && echo GET_PRODDETAIL_URL is "$GET_PRODDETAIL_URL" || echo GET_PRODDETAIL_URL is not set
        test -n "$AWS_REGION" && echo AWS_REGION is "$AWS_REGION" || echo AWS_REGION is not set
        test -n "$ACCOUNT_ID" && echo ACCOUNT_ID is "$ACCOUNT_ID" || echo ACCOUNT_ID is not set
        echo -e "Please set the variables as shown in Step 21 and re-try \n"
    else
        echo "executing the command to test connection from 'prodcatalog' to 'proddetail' using Amazon VPC lattice endponts."; echo
		echo $CHECK_CONN_CATLOG_TO_PRODDETAIL;
        eval $CHECK_CONN_CATLOG_TO_PRODDETAIL;
        echo -e "-----------------------------------------------\n"
        echo "executing the command to test connection from 'frontend-node' to 'prodcatalog' using Amazon VPC lattice endponts."; echo
		echo $CHECK_CONN_FRONTEND_TO_CATALOG
        eval $CHECK_CONN_FRONTEND_TO_CATALOG
        echo -e "-----------------------------------------------\n"
        echo "compare both outputs"
		echo $CHECK_CONN_FRONTEND_TO_CATALOG
        eval $CHECK_CONN_FRONTEND_TO_CATALOG; echo -e '-----------\n';
		echo $CHECK_CONN_CATLOG_TO_PRODDETAIL
		eval $CHECK_CONN_CATLOG_TO_PRODDETAIL
    fi
```

#### **Service Impact**: - because we need to remove flag on namespace to remove App Mesh sidecar injection ####

**Step 11: Step 24 from main [README.md](README.md) file: configure application to work using Amazon VPC lattice endponts.**
	**Disable appmesh injection using namespace.** `appmesh.k8s.aws/sidecarInjectorWebhook: enabled`: The sidecar injector will inject the sidecar into pods by default. Add the `appmesh.k8s.aws/sidecarInjectorWebhook` annotation with value `disabled` to the namespace labels to override the default and disable injection. [see documentation here](https://aws.github.io/aws-app-mesh-controller-for-k8s/reference/injector/)**
		
``` bash
	kubectl get ns $oldns_name -o yaml|tee -a $oldns_name.backup.yaml
	kubectl label ns $oldns_name --overwrite {mesh-,gateway-,appmesh.k8s.aws/sidecarInjectorWebhook-}
```



**Step 12:	rolling restart the deployments.**

```bash		
	for app in prodcatalog proddetail frontend-node proddetail2
	  do
		kubectl -n $oldns_name rollout restart deployment $app
	done
```

**Step 13: validate the containers in the pods, give it a min to clean up the old pods**

```bash
	kubectl -n $oldns_name get pods -o 'custom-columns=POD:.metadata.name,CONTAINER:.spec.containers[*].name' |egrep -i 'prodcatalog|proddetail|frontend-node|proddetail2'
```
	
**Step 14: test connectivity again using Step 22 and 23 and using these commands**
	Get inside **"frontend-node"** container and see if it can get data **"prodcatalog"** AppMesh service

```bash
	kubectl -n $oldns_name exec -it `kubectl get pods -n $oldns_name -l app=frontend-node -o jsonpath='{.items[].metadata.name}'` -c frontend-node -- curl http://prodcatalog.prodcatalog-ns.svc.cluster.local:5000/products/ 2>&1|jq -s
```

	Get inside **"prodcatalog"** container and see if it can get data from **"proddetail"** AppMesh service

```bash
	kubectl -n $oldns_name exec -it `kubectl get pods -n $oldns_name -l app=prodcatalog -o jsonpath='{.items[].metadata.name}'` -c prodcatalog -- curl http://proddetail.prodcatalog-ns.svc.cluster.local:3000/catalogDetail 2>&1|jq -s
```

**Step 15: Validate the files and endpoints**

```bash
	echo $GET_CATALOG_URL
	echo $GET_PRODDETAIL_URL
	grep -n svc.cluster.local ./eks-app-mesh-polyglot-demo/deployment/base_app.yaml
	echo "Please validate make sure new URLs (shows below) are correct"		
	oldns_cmd ./eks-app-mesh-polyglot-demo/deployment/base_app.yaml|sed -e "s/prodcatalog.prodcatalog-ns.svc.cluster.local/$GET_CATALOG_URL/g" -e "s/proddetail.prodcatalog-ns.svc.cluster.local/$GET_PRODDETAIL_URL/g" |envsubst |egrep -n ':5000/products/|:3000/catalogDetail'
```

**Step 15.1: update apps to use Amazon VPC lattice endpoints. Finally apply the changes**

```bash
	oldns_cmd ./eks-app-mesh-polyglot-demo/deployment/base_app.yaml |sed -e "s/prodcatalog.prodcatalog-ns.svc.cluster.local/$GET_CATALOG_URL/g" -e "s/proddetail.prodcatalog-ns.svc.cluster.local/$GET_PRODDETAIL_URL/g"|envsubst|kubectl apply -f -
```

**Step 16: Validate your application is working as expected using VPC Lattice URLs**
+ Re-Run step 9 and Step 10 from this file. This time you should see connections work using VPC Lattice URLs.

**Step 17: reconfigure the ingress load balancer to point to front-end service port**

```bash
#kubectl -n $oldns_name edit service/ingress-gw
# set targetPort to 9000 and selector app to 'frontend-node'
# targetPort: 9000
#  selector:
#    app: frontend-node
kubectl -n $oldns_name get service/ingress-gw -o yaml |sed -e 's/8088/9000/g' -e "s/app:.*/app: frontend-node/"|kubectl apply -f -

```
Output of below given command should be `9000,frontend-node`

```bash
	kubectl -n $oldns_name get service/ingress-gw -o jsonpath='{.spec.ports[0].targetPort},{.spec.selector.app}'
```

Try accessing the application using Ingress LB URL.

```bash
	kubectl -n $oldns_name get service/ingress-gw -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

**Step 18: AppMesh Cleanup: delete all the appmesh related compoments**
```bash
	for appmesh_svc in `kubectl get all -n $oldns_name |awk '/appmesh/ {print $1}'`
	  do
		kubectl -n $oldns_name delete $appmesh_svc --wait=0
	done
	kubectl -n $oldns_name delete deployment.apps/ingress-gw
	kubectl delete meshes prodcatalog-mesh --wait=0
```
######*Validate the app and think about replacing the Service Account too. It is leftover from Step 5: Step 15 from main [README.md](README.md) file uses new service account `prodcatalog-lattice-sa`.*

-------
**Step 19: Cleanup for EKS infrastructure**
Once you have a solid understanding of the process and are satisfied with your testing on the EKS cluster created as part of the [AppMesh-Install-README.md](AppMesh-Install-README.md) steps, be sure to delete the resources to avoid future charges. You can do this by following the cleanup section of the EKS Blueprints pattern or by executing the following comamnd:

```bash
bash vpc-lattice-config/files/latticeblogcleanup.sh
```

###Conclusion:
+ By following the steps outlined in this guide, you can seamlessly transition your microservices architecture while maintaining service reliability and improving operational efficiency. 
+ Migrating from AWS App Mesh to Amazon VPC Lattice provides a robust solution for managing application networking at scale, offering enhanced connectivity, load balancing, and security features. 
+ Be sure to explore the repository for more advanced use cases mentioned in [README.md](../README.md)
+ Remember to clean up any resources once you're done testing to avoid unnecessary charges.
+ Please refer back to the blog using [this](link_to_be_added_here) link.
