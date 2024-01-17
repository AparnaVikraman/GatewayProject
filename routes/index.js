const express = require('express');
const router = express.Router();
const axios = require('axios');
const registry = require('./registry.json');
const fs = require('fs');
const loadbalancer = require('../util/loadbalancer');

router.all('/:apiName/:path', (req, res) => {
    console.log(req.params.apiName);
    const serviceInfo = registry.services[req.params.apiName];

    if (serviceInfo) {
        if (!serviceInfo.loadBalancerStrategy) {
            serviceInfo.loadBalancerStrategy = "ROUND_ROBIN";
        }
        const newIndex = loadbalancer[serviceInfo.loadBalancerStrategy](serviceInfo);
        const url = serviceInfo.instances[newIndex].url;
        console.log(url)
        axios({
            method: req.method,
            url: url + req.params.path,
            headers: req.headers,
            data: req.body
        }).then((response) => {
            res.send(response.data);
        }).catch(error => {
            res.send("Unable to reach the instance " + error)
        })
    } else {
        console.log("no exists")
        res.send("API name doesn't exists");
    }
})

router.post('/register', (req, res) => {
    const registrationInfo = req.body;
    registrationInfo.url = registrationInfo.protocol + '://' + registrationInfo.host + ':' + registrationInfo.port + '/';

    if (apiAlreadyExists(registrationInfo)) {
        res.send("Configuration alredy exists for " + registrationInfo.apiName + " at " + registrationInfo.url)
    } else {
        registry.services[registrationInfo.apiName]["index"] = 0;
        registry.services[registrationInfo.apiName]["instances"].push({...registrationInfo})

        fs.writeFile('./routes/registry.json',
        JSON.stringify(registry),
        (error) => {
            if (error) {
                res.send("Could not register the API " + registrationInfo.apiName + "\n" + error)
            } else {
                res.send("Successfully registered " + registrationInfo.apiName)
            }
        })
    }
    
})

router.post('/unregister', (req, res) => {
    const registrationInfo = req.body;
    if (registry.services[registrationInfo.apiName]) {
        if (apiAlreadyExists(registrationInfo)) {
            const index = registry.services[registrationInfo.apiName]["instances"].findIndex((instance) => {
                return registrationInfo.url === instance.url;
            })
            registry.services[registrationInfo.apiName]["instances"].splice(index, 1)

            fs.writeFile('./routes/registry.json',
            JSON.stringify(registry),
            (error) => {
                if (error) {
                    res.send("Could not unregister the API " + registrationInfo.apiName + "\n" + error)
                } else {
                    res.send("Successfully unregistered " + registrationInfo.apiName)
                }
            })
        } else {
            res.send("Configuration doesn't exists for " + registrationInfo.apiName + " at " + registrationInfo.url)
        }
    } else {
        res.send("API name is not registered " + registrationInfo.apiName)
    }
})

const apiAlreadyExists = (registrationInfo) => {
    let exists = false;
    registry.services[registrationInfo.apiName]["instances"].forEach((instance) => {
        if (instance.url === registrationInfo.url) {
            exists = true
        }
    })

    return exists
}

module.exports = router