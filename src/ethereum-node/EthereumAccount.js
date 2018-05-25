const Web3 = require('web3');
const fs = require('fs');
const solc = require('solc');

class EthereumAccount {

    constructor(url, coinBase, password) {
        this._web3 = new Web3(new Web3.providers.HttpProvider(url));
        this._web3.eth.personal.unlockAccount(coinBase, password);
        this._coinBase = coinBase;
    }

    get coinBase() {
        return this._coinBase;
    }

    async getBalance() {
        const balance = await this._web3.eth.getBalance(this.coinBase);
        return this._web3.utils.fromWei(balance);
    }

    /**
     * 
     * @param {string} contractPath 
     * @param {string} contractAddress 
     */
    async initContract(contractPath, contractAddress, args = []) {
        const file = fs.readFileSync(contractPath, 'utf8');

        const compiled = solc.compile(file);
        let data, abi;
        for (let contractName in compiled.contracts) {
            data = `0x${compiled.contracts[contractName].bytecode}`;
            abi = JSON.parse(compiled.contracts[contractName].interface);
        }

        let contract;

        if (this._web3.utils.isAddress(contractAddress)) {
            contract = new this._web3.eth.Contract(abi, contractAddress);
        } else {
            contract = new this._web3.eth.Contract(abi);
            contract = await contract.deploy({
                data: data,
                arguments: args
            })
                .send({
                    from: this._coinBase,
                    gas: 1500000,
                    gasPrice: '300000'
                })
                .on('error', err => {
                    throw new Error(err)
                });
        }
        return contract;
    }

    /**
     * 
     * @param {number} gasAmount 
     */
    async checkPayablePossibility(gasAmount) {
        const gasPrice = this._web3.utils.fromWei(await this._web3.eth.getGasPrice());
        const ethCost = gasAmount * gasPrice;
        return await this.getBalance() >= ethCost;
    }
}


module.exports = EthereumAccount;