const aws = require('aws-sdk');
const { Pool } = require('pg');

const ssm = new aws.SSM({region: 'us-west-2', apiVersion: '2014-11-06'});

let pool = null;

// export default function name(params) {
//     const secretName = "dev/db";
//     const client = new AWS.SecretsManager({
//         region: "us-west-2"
//     });
//     client.getSecretValue({SecretId: secretName}, function(err, data) {
//         if (err) {
//             res.send(err);
//         } else {
//             if ('SecretString' in data) {
//                 secret = JSON.parse(data.SecretString);
//                 res.send(secret);
//             } else {
//                 let buff = new Buffer(data.SecretBinary, 'base64');
//                 decodedBinarySecret = buff.toString('ascii');
//                 res.send(decodedBinarySecret);
//             }
//         }
//     });
// }

const getConnection = async () => {
    // let params = {
    //     Name: 'blog-project-ecs-aurora-cluster',
    //     WithDecryption: true,
    // };
    let dbString = process.env.DATABASE_URL;
    // if (process.env.ENV === 'prod') {
    //     await ssm.getParameter(params, (err, data) => {
    //         // console.log('===============================');
    //         // console.log(data);
    //         // console.log('===============================');
    //         dbString = data.Parameter.Value;
    //         if (err) {
    //             console.log("Error occurred: ", err);
    //         }
    //     }).promise();
    // }

    if (pool === null) {
        pool = new Pool({
            connectionString: dbString
        });
    }
    
    let connection = await pool.connect();

    return connection;
}

const getPool = async () => {
    
    // let params = {
    //     Name: 'db_env',
    //     WithDecryption: true,
    // };
    let dbString = process.env.DATABASE_URL;
    // if (process.env.ENV === 'prod') {
    //     await ssm.getParameter(params, (err, data) => {
    //         dbString = data.Parameter.Value;
    //         if (err) {
    //             console.log("Error occurred: ", err);
    //         }
    //     }).promise();
    // }

    if (pool === null) {
        pool = new Pool({
            connectionString: dbString,
            max: 20
        });
    }

    return pool;
}

module.exports = Object.freeze({
    getConnection : getConnection,
    getPool : getPool,
});