const aws = require('aws-sdk');
const { Pool } = require('pg');

const ssm = new aws.SSM({region: 'us-west-2', apiVersion: '2014-11-06'});

let pool = null;

const getConnection = async () => {
    let dbString = process.env.DATABASE_URL;

    if (pool === null) {
        pool = new Pool({
            connectionString: dbString
        });
    }
    
    let connection = await pool.connect();

    return connection;
}

const getPool = async () => {
    
    let dbString = process.env.DATABASE_URL;

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