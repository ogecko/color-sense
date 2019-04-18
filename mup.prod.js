module.exports = {
  servers: {
    snow2: {
      host: '52.63.248.24',
      "username": "ubuntu",
      "pem": "./awskeys.pem",
    }
  },

  meteor: {
    name: 'color-sense',
    path: '.',
    dockerImage: 'abernix/meteord:base',
    servers: {
      snow2: {}
    },
    buildOptions: {
      serverOnly: true,
    },
    env: {
      ROOT_URL: 'https://www.ogecko.com',
    },

    //dockerImage: 'kadirahq/meteord'
    deployCheckWaitTime: 60
  },
  proxy: {
    domains: 'www.ogecko.com',
    ssl: {
      forceSSL: true,
      // Enable let's encrypt to create free certificates
      letsEncryptEmail: 'admin@ogecko.com'
      },
    shared: {
      envLetsEncrypt: {
        ACME_CA_URI: 'https://acme-staging.api.letsencrypt.org/directory',
        DEBUG: true
      }
    }
  },

  mongo: {
    oplog: true,
    port: 27017,
    servers: {
      snow2: {},
    },
  },
};

