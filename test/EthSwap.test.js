const { assert } = require('chai');
const { default: Web3 } = require('web3');
const { Eth } = require('web3-eth');
const web3_utils = require('web3-utils')

const Token = artifacts.require("Token")
const EthSwap = artifacts.require("EthSwap");

require('chai')
    .use(require('chai-as-promised'))
    .should()

const tokens = (n)=>{
    return web3_utils.toWei(n,'ether')
}

contract ('EthSwap',([deployer,investor])=>{
    let token,ethSwap
    
    before(async()=>{
        token = await Token.new()
        ethSwap = await EthSwap.new(token.address)
        
        // trasnfer all the tokens to ethswap (1 Milliom)
        await token.transfer(ethSwap.address,tokens('1000000'))
    })
    describe('Token Deployment',async()=>{
        it('contract has a name',async()=>{
            const name = await token.name()
            assert.equal(name,'DApp Token')
        })
    })

    describe('Eth Swap deployment',async()=>{
        it('contract has a name',async()=>{
            const name = await ethSwap.name()
            assert.equal(name,'EthSwap Instant Exchange')
        })

        it('contract has tokens',async()=>{
            
            let balance = await token.balanceOf(ethSwap.address)
            assert.equal(balance.toString(),tokens('1000000'))
        })
    })

    describe('buy tokens()',async()=>{
        let result
        before(async()=>{
            // purchase token before each example
            result = await ethSwap.buyTokens({from:investor,value:web3_utils.toWei('1','ether')})
        })
        it('allows user to instantly purchase tokesn from ethswap for a fixed price',async()=>{
            // check investor token balance after purchase
            let investorBalance = await token.balanceOf(investor)
            assert.equal(investorBalance.toString(),tokens('100'))

            // check ethSwap balance after purchase
            let ethSwapBalance
            ethSwapBalance = await token.balanceOf(ethSwap.address)
            assert.equal(ethSwapBalance.toString(),tokens('999900'))
            
            ethSwapBalance = await web3.eth.getBalance(ethSwap.address)
            
            assert.equal(ethSwapBalance.toString(),web3_utils.toWei('1','ether'))
            
            // check logs to ensure event was emitted with correct data

            const event = result.logs[0].args
            assert.equal(event.account,investor)
            assert.equal(event.token,token.address)
            assert.equal(event.amount.toString(),tokens('100').toString())
            assert.equal(event.rate.toString(),'100')
        })
    })
    describe('sell tokens()',async()=>{
        let result
        before(async()=>{
            // investor must approve the token
            await token.approve(ethSwap.address,tokens('100'),{from:investor})
            // purchase token before each example
            result = await ethSwap.sellTokens(tokens('100'),{from:investor})
        })
        it('allows user to instantly sell tokesn to ethswap for a fixed price',async()=>{
            let investorBalance = await token.balanceOf(investor)
            assert.equal(investorBalance.toString(),tokens('0'))

            // check ethSwap balance after purchase

            let ethSwapBalance
            ethSwapBalance = await token.balanceOf(ethSwap.address)
            assert.equal(ethSwapBalance.toString(),tokens('1000000'))
            ethSwapBalance = await web3.eth.getBalance(ethSwap.address)
            assert.equal(ethSwapBalance.toString(),web3_utils.toWei('0','ether'))
            
            // check logs to ensure event was emitted with correct data
            const event = result.logs[0].args
            assert.equal(event.account,investor)
            assert.equal(event.token,token.address)
            assert.equal(event.amount.toString(),tokens('100').toString())
            assert.equal(event.rate.toString(),'100')

            // Failure : investor can't sell more token than they have

            await ethSwap.sellTokens(tokens('500',{from:investor})).should.be.rejected;
        })
    })
})