# Migration from AWS App Mesh to Amazon VPC Lattice


## Getting started

This document is designed to give you an overview of the migration process. You can use this example as a reference to adapt the steps for your own microservices applications migration.

### Step 1: Setup sample application on a new cluster
* To follow along, set up the application as mentioned in [AppMesh-Install-README.md](vpc-lattice-config/AppMesh-Install-README.md) before proceeding with the migration steps.


The application referenced in the [blog](https://aws.amazon.com/blogs/containers/migrating-from-aws-app-mesh-to-amazon-vpc-lattice/) is located in [eks-app-mesh-polyglot-demo](https://github.com/aws-containers/eks-app-mesh-polyglot-demo) repository. All the necessary configuration files and steps for the migration to Amazon VPC Lattice are provided in [vpc-lattice-config](vpc-lattice-config) directory.

### Migration Approach
We have outlined steps for 2 possible approaches but are using 1st approach (In-Place migration) as mentioned [blog](https://aws.amazon.com/blogs/containers/migrating-from-aws-app-mesh-to-amazon-vpc-lattice/).
###### *Note: Scripts and commands outlined in both apparoaches assume that you have already completed steps mentioned in [AppMesh-Install-README.md](vpc-lattice-config/AppMesh-Install-README.md)*
+ [1. In-Place migration](vpc-lattice-config/In-place-migration-steps.md)

######
+ [2. New deployment in a new namespace](vpc-lattice-config/README.md).

### Additional topics:
+ [Securing the network and implementing AWS IAM authentication with Amazon VPC Lattice and Amazon EKS](vpc-lattice-config/IAMAUTH.md)

+ [Secure Cross-Cluster Communication in EKS with VPC Lattice and Pod Identity IAM Session Tags](https://aws.amazon.com/blogs/containers/secure-cross-cluster-communication-in-eks-with-vpc-lattice-and-pod-identity-iam-session-tags/)

+ [Amazon VPC Lattice user guide](https://docs.aws.amazon.com/vpc-lattice/latest/ug/what-is-vpc-lattice.html)
## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
