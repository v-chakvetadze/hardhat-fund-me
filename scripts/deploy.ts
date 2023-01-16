import { ethers } from 'hardhat';

const main = async () => {
  console.log('deploy');
};

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
