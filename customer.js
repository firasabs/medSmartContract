import { contractABI } from './consts.js'; 
import { contractAddress } from './consts.js';

async function loadContract() {
	const provider = new ethers.providers.Web3Provider(window.ethereum);
	const signer = provider.getSigner();
	const contract = new ethers.Contract(contractAddress, contractABI, signer);

	return contract;
}

document.getElementById('getMedicineButton').addEventListener('click', async () => {
	try {
		const contract = await loadContract();

		const medicineId = document.getElementById('getMedicineId').value;
		const medicineInfo = await contract.getMedicine(medicineId);
		const { name, medicineAmount, expiryDate, ipfsHash } = medicineInfo;
		const ipfsLink = `https://ipfs.io/ipfs/${ipfsHash}`;
		document.getElementById('medicineInfo').innerHTML = `
			<p>Medicine Name: ${name}</p>
			<p>Amount: ${medicineAmount}</p>
			<p>Expiry Date: ${expiryDate}</p>
			<p>Document: <a href="${ipfsLink}" target="_blank">View Document</a></p>
		`;
	} catch (error) {
		document.getElementById("medicineInfo").innerText = `There was an Error: ${error.message}`;
	}
});

document.getElementById("checkAvailabilityButton").addEventListener("click", async () => {

	const contract = await loadContract();


	const medicineId = document.getElementById("medicineIdCheck").value;
	try {
		const medicineDetails = await contract.getMedicine(medicineId);
		if (medicineDetails.medicineAmount > 0) {
			document.getElementById("availabilityMessage").innerText = `Medicine is available, Amount left: ${medicineDetails.medicineAmount}`;
		} else {
			console.log(medicineDetails.medicineAmount);
			document.getElementById("availabilityMessage").innerText = "Medicine is out of stock.";
		}
	} catch (error) {
		document.getElementById("statusMessage").innerText = "Error checking availability.";
		console.error(error);
	}
});

document.getElementById("buyMedicineButton").addEventListener("click", async () => {
	const contract = await loadContract();
	const statusMessage = document.getElementById("medicineBuy");

	try {
		const medicineId = document.getElementById("buyMedicineId").value;
		const medicineAmount = document.getElementById("medicineAmount").value;

		const uniquePurchaseId = generateUniqueId(medicineId);

		statusMessage.innerText = "Creating buy request transaction...";
		const tx = await contract.requestBuyMedicine(medicineId, medicineAmount, uniquePurchaseId);
		statusMessage.innerText = "Transaction in progress, please wait for confirmation...";
		await tx.wait();
		statusMessage.innerText = "Buy request sent successfully! Unique ID: " + uniquePurchaseId;
	} catch (error) {
		console.error("Error requesting buy:", error);
		statusMessage.innerText = "Error: Unable to send buy request. Please try again.";
	}
});




document.getElementById('viewMedicinesButton').addEventListener('click', async () => {
	const cryptoAddress = document.getElementById('cryptoAddress').value;

	if (!cryptoAddress) {
		document.getElementById('cryptoMessage').innerText = 'Please enter your crypto address.';
		return;
	}

	try {
		const contract = await loadContract(); 

		const allRequests = await contract.getAllRequestsByBuyer(cryptoAddress);
		displayAllRequests(allRequests);
	} catch (error) {
		document.getElementById('cryptoMessage').innerText = `Error fetching requests: ${error.message}`;
		console.error('Error fetching requests:', error);
	}
});

function displayAllRequests(requests) {
	const medicinesListDiv = document.getElementById('medicinesList');
	medicinesListDiv.innerHTML = ''; 

	if (requests.length === 0) {
		medicinesListDiv.innerHTML = '<p>No requests found for this address.</p>';
		return;
	}

	requests.forEach(request => {
		const requestElement = document.createElement('div');

const completeButton = request.approved && !request.completed
    ? `<button onclick="completePurchase(${request.requestedAmount}, '${request.uniqueId}')">Complete Purchase</button>`
    : '';


		requestElement.innerHTML = `
    <p>Medicine ID: ${request.medicineId}</p>
    <p>Requested Amount: ${request.requestedAmount}</p>
    <p>Status: ${request.rejected
				? 'Rejected'
				: request.approved
					? (request.completed ? 'Completed' : 'Approved')
					: 'Pending'
			}</p>
	<p>Unique ID: ${request.uniqueId}</p>


    ${completeButton}
    <hr>
`;

		medicinesListDiv.appendChild(requestElement);
	});
}


window.completePurchase = async function (requestedAmount, uniqueId) {

		const statusMessage = document.getElementById("cryptoMessage");
	
		try {
			statusMessage.innerText = "Processing payment...";
			console.log(`Requested Amount: ${requestedAmount}`);
	
			const pricePerUnit = ethers.utils.parseEther("0.02"); 
			const totalCost = pricePerUnit.mul(requestedAmount); 
			console.log(`Price Per Unit: ${pricePerUnit.toString()}, Total Cost: ${totalCost.toString()}`);
	
			const contractOwner = await getContractOwner();
			console.log(`Contract Owner Address: ${contractOwner}`);
	
	
			const provider = new ethers.providers.Web3Provider(window.ethereum);
			const signer = provider.getSigner();
			const tx = await signer.sendTransaction({
				to: contractOwner,
				value: totalCost
			});
	
			statusMessage.innerText = "Transaction in progress, please wait for confirmation...";
			console.log(`Transaction Hash: ${tx.hash}`);
			
	
			await tx.wait();
			
			const contract = await loadContract(); 
			const completeRequestTx = await contract.completeBuyRequest(uniqueId);
			statusMessage.innerText = "Second transaction...";
			await completeRequestTx.wait();
			console.log(`Complete Buy Request Transaction Hash: ${completeRequestTx.hash}`);
			statusMessage.innerText = "Payment completed successfully!";

	
			console.log(`Buy request completed for unique ID: ${uniqueId}`);
			const allRequests = await contract.getAllRequestsByBuyer(cryptoAddress); 
			displayAllRequests(allRequests);
		} catch (error) {
			console.error("Error completing payment:", error);
		}
};





async function getContractOwner() {
	const contract = await loadContract(); 
	const owner = await contract.owner();
	console.log(`Fetched Contract Owner: ${owner}`);
	return owner;
}


function generateUniqueId(medicineId) {
	const timestamp = Date.now();
	return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["string", "uint256"], [medicineId, timestamp]));
}
