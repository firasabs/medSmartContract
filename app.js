import { uploadToIPFS } from './ipfs.js';
import { contractABI } from './consts.js';
import { contractAddress } from './consts.js';

async function connectToMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            console.log('Connected to MetaMask');
            const walletAddress = await signer.getAddress();
            document.getElementById("statusMessage").innerText = `Connected wallet: ${walletAddress}`;

            return { provider, signer };
        } catch (error) {
            console.error('Error connecting to MetaMask:', error);
        }
    } else {
        alert('MetaMask is not installed.');
    }
}


async function loadContract() {
    console.log("Loading contract...");
    const { signer } = await connectToMetaMask();
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    console.log("Contract loaded:", contract);
    return contract;
}

document.getElementById('addMedicineButton').addEventListener('click', async () => {
    try {
        console.log("Add Medicine button clicked.");
        const contract = await loadContract();
        const medicineDocument = document.getElementById('medicineDocument').files[0];

        const medicineId = document.getElementById('medicineId').value;
        const medicineName = document.getElementById('medicineName').value;
        const medicineAmount = document.getElementById('medicineAmount').value;
        const expiryDate = document.getElementById('expiryDate').value;

        console.log("Input values:", { medicineId, medicineName, medicineAmount, expiryDate, medicineDocument });

        if (!medicineId || !medicineName || !medicineAmount || !expiryDate || !medicineDocument) {
            console.error('One or more input fields are missing.');
            document.getElementById("statusMessage").innerText = 'Please fill in all fields and select a document.';
            return;
        }

        const ipfsHash = await uploadToIPFS(medicineDocument);
        console.log("IPFS Hash:", ipfsHash);

        const tx = await contract.addMedicine(medicineId, medicineName, medicineAmount, expiryDate, ipfsHash);
        await tx.wait();
        console.log("Transaction completed:", tx);

        document.getElementById("statusMessage").innerText = 'Medicine added successfully!';
    } catch (error) {
        document.getElementById("statusMessage").innerText = `Error : ${error.message}`;
        console.error("Error adding medicine:", error);
    }
});

document.getElementById('removeMedicineButton').addEventListener('click', async () => {
    try {
        console.log("Remove Medicine button clicked.");
        const contract = await loadContract();
        const medicineId = document.getElementById('medicineId').value;

        console.log("Medicine ID:", medicineId);

        if (!medicineId) {
            console.error('Medicine ID is missing.');
            document.getElementById("statusMessage").innerText = 'Please enter a Medicine ID.';
            return;
        }

        const tx = await contract.removeMedicine(medicineId);
        await tx.wait();
        console.log("Transaction completed:", tx);

        document.getElementById("statusMessage").innerText = 'Medicine removed successfully!';
    } catch (error) {
        document.getElementById("statusMessage").innerText = `Error : ${error.message}`;
        console.error("Error removing medicine:", error);
    }
});

document.getElementById('getMedicineButton').addEventListener('click', async () => {
    try {
        console.log("Get Medicine button clicked.");
        const contract = await loadContract();
        const medicineId = document.getElementById('getMedicineId').value;

        console.log("Fetching details for Medicine ID:", medicineId);
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
        console.error("Error fetching medicine details:", error);
    }
});

document.getElementById('subtractMedicineButton').addEventListener('click', async () => {
    try {
        console.log("Subtract Medicine button clicked.");
        const contract = await loadContract();
        const medicineId = document.getElementById('medicineIdUpdate').value;
        const amountToSubtract = document.getElementById('medicineAmountSubtract').value;

        console.log("Medicine ID to update:", medicineId);
        console.log("Amount to subtract:", amountToSubtract);

        if (!medicineId || !amountToSubtract) {
            console.error('One or more input fields are missing.');
            document.getElementById("updateStatusMessage").innerText = 'Please fill in all fields.';
            return;
        }

        const tx = await contract.subtractMedicineAmount(medicineId, amountToSubtract);
        await tx.wait();
        console.log("Transaction completed:", tx);

        document.getElementById("updateStatusMessage").innerText = 'Medicine amount subtracted successfully!';
    } catch (error) {
        document.getElementById("updateStatusMessage").innerText = `Error: ${error.message}`;
        console.error("Error subtracting medicine amount:", error);
    }
});


async function loadBuyRequests() {
    console.log("Loading buy requests...");
    
    const contract = await loadContract();
    const requestCount = await contract.requestCount();
    console.log("Total buy requests:", requestCount.toString()); 

    const requests = [];
	const indexes = [];

    for (let i = 0; i <= requestCount-1; i++) {
        try {
            const request = await contract.buyRequests(i);
            
            console.log(`Request ${i}:`, request);

            if (!request.approved && !request.rejected) {
                requests.push(request);
				indexes.push(i);
            }
        } catch (error) {
            console.error(`Error fetching request ${i}:`, error);
        }
    }

    console.log("Filtered buy requests (not approved):", requests);
    displayBuyRequests(requests,indexes);
}


function displayBuyRequests(requests,indexes) {
    const requestsDiv = document.getElementById("buyRequests");
    requestsDiv.innerHTML = '';

    requests.forEach((request, index) => {
        console.log("Displaying request:", request);
        const requestElement = document.createElement("div");
        requestElement.innerHTML = `
            <p>Medicine ID: ${request.medicineId}</p>
            <p>Buyer: ${request.buyer}</p>
            <p>Requested Amount: ${request.requestedAmount}</p>
            <button onclick="approveRequest(${indexes[index]})">Approve</button>
            <button onclick="rejectRequest(${indexes[index]})">Reject</button>
        `;
        requestsDiv.appendChild(requestElement);
    });
}

async function approveRequest(requestId) {
    const contract = await loadContract();
    try {
        console.log(`Approving request ID: ${requestId}`);
        const tx = await contract.approveBuyRequest(requestId);
        await tx.wait();
        alert(`Request ${requestId} approved!`);
        loadBuyRequests();  
    } catch (error) {
        console.error("Error approving request:", error);
    }
}

async function rejectRequest(requestId) {
    const contract = await loadContract();
    try {
        console.log(`Rejecting request ID: ${requestId}`);
        const tx = await contract.rejectBuyRequest(requestId);
        await tx.wait();
        alert(`Request ${requestId} rejected!`);
        loadBuyRequests();  
    } catch (error) {
        console.error("Error rejecting request:", error);
    }
}

document.addEventListener("DOMContentLoaded", loadBuyRequests);
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest; 
