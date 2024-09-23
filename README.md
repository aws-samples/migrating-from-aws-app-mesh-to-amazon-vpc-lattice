# Migration from AWS App Mesh to Amazon VPC Lattice


## Getting started

To follow this blog effectively, clone the entire repository. The application referenced in this blog is located in [eks-app-mesh-polyglot-demo](https://github.com/aws-containers/eks-app-mesh-polyglot-demo) repository, and all the necessary configuration files for the migration to Amazon VPC Lattice is present in [vpc-lattice-config](vpc-lattice-config) directory.

It is assumed that you already have an application integrated with App Mesh. The intention of this blog is to just give you an idea of how the migration process will look like.

However, if you are using this blog to learn the migration process and need to follow along, set up the application as mentioned in [README.md](https://github.com/aws-containers/eks-app-mesh-polyglot-demo/README.md) before proceeding with the migration steps.

We have provided steps for 2 possible approaches:
* [1. New deployment in a new namespace](vpc-lattice-config/README.md)
#
* [2. In-Place migration](vpc-lattice-config/In-place-migration-steps.md)
#
Additional topics:
* [Securing the network and implementing AWS IAM authentication with Amazon VPC Lattice and Amazon EKS](vpc-lattice-config/IAMAUTH.md)

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
