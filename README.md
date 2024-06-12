# LovePoem NFT Ticketing

LovePoem NFT leverages blockchain technology to tokenize concert tickets as NFTs built using ERC721URIStorage standards. These NFT tickets offer transparent ownership verification, mitigating the risk of fraud or invalidation by third-party entities. Additionally, they provide fans with exclusive benefits that are distributed fairly among the holders. The concept of LovePoem derives from an artist that I enjoy listening to, whose concert I had great difficulty in securing the tickets for and resorted to a help-to-buy service that intially secured and even sent me a ticket, but informed me later on that their payment transaction to ticketmaster was rejected. The only evidence I could leverage on was the agent's screenshot of the bank application's notification informing them about the refund. There was no way to check if this was indeed true, and there were also numerous cases of scalpers scamming other people. This whole unpleasant experience inspired the exploration of blockchain technology as a solution to improve transparency, ownership verification, and fan engagement in the ticketing process.

## Integration of Chainlink services
- Chainlink VRF function to randomly distribute the benefits that comes with holding the NFT ticket
- Verification of the event listed on the platform via Chainlink Functions request to cross check with the event provider

## Other
- Explored IPFS storage for off-chain storage of metadata. 

## Stack used
- Solidity
- Hardhat
- Typescript
  
```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
```
