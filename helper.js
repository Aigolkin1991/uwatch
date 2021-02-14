const https = require('https')
const { brotliDecompress } = require('zlib')

/**
 * 
 * @param {Buffer} data 
 */
const decodeBrotli = (data) => {
    return new Promise((resolve, reject) => {
        brotliDecompress(data, (err, res) => {
            err ? reject(err) : resolve(res);
        })
    })
}

/**
 * @param {String} data JSON stringifyed data 
 * @returns {Promise}
 */
const sendJSONPost = (data, host, path, port) => {
    return new Promise((resolve, reject) => {
        const req = https.request({
            host,
            path,
            port,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'User-Agent': 'NodeJS/12.0',
                'Accept': '*/*',
                'Host': 'uwatch.live',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive'
                
            }
        }, async (res) => {
            const encoding = res.headers['content-encoding'] ? res.headers['content-encoding'] : 'none';
            const isJson = res.headers['content-type'] && res.headers['content-type'].indexOf('application/json') !== -1 ? true : false;
            const data = await retrieveResponseData(res, encoding, isJson);
            resolve(data);
        });
    
        req.on('error', (err) => {
            reject(err)
        })
    
        req.write(data);
        req.end();
    })
}

/**
 * 
 * @param {ReadStream} stream 
 * @param {String} encoding
 */
const retrieveResponseData = (stream, encoding, isJson) => {
    return new Promise(async (resolve, reject) => {
        const body = [];
        stream.on('data', (chunk) => {
            body.push(chunk);
        })
        stream.on('end', async () => {
            let dataString;
            switch (encoding) {
                case 'br':
                    dataString = await decodeBrotli(Buffer.concat(body));
                    break ;
                default:
                    dataString = body.join('');
            }
            if (!dataString.length) {
                resolve(null);
            } else {
                if(!isJson){
                    resolve(dataString)
                } else {
                    try {
                        resolve(JSON.parse(dataString));
                    } catch(e) {
                        reject('POST body parse error' + e);
                    }
                }
            }
        })
    })
}

module.exports = {
    sendJSONPost,
    retrieveResponseData
}