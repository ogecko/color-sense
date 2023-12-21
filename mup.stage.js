module.exports = {
  servers: {
    nuc01: {
      host: '192.168.50.16',
      username: 'jdm',
      password: 'ih4ku6',
      // pem:
      // or leave blank for authenticate from ssh-agent
    }
  },

  meteor: {
    name: 'color-sense',
    path: '.',
    dockerImage: 'abernix/meteord:base',
    servers: {
      nuc01: {}
    },
    buildOptions: {
      serverOnly: true,
      debug: true,
    },
    env: {
      PORT: 3020,
      ROOT_URL: 'http://192.168.50.16',
      MONGO_URL: 'mongodb://192.168.50.16:27017/color-sense',
      MONGO_OPLOG_URL: "mongodb://192.168.50.16:27017/local",
    },

    //dockerImage: 'kadirahq/meteord'
    deployCheckWaitTime: 60
  },

  // mongo: {
  //   oplog: true,
  //   port: 27017,
  //   servers: {
  //     nuc01: {},
  //   },
  // },
};