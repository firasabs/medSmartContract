// ipfs.js
const pinataApiKey = String("4317eb764b7c551ecb98");
const pinataSecretKey = String("8d267340793e3e445511c615bfc326631b9d1df2f260dab9224609b40d2937d9");
const pinataUploadUrl = String("https://api.pinata.cloud/pinning/pinFileToIPFS");


// Function to upload a file to Pinata's IPFS
export async function uploadToIPFS(file) {
    const data = new FormData();
    data.append('file', file);

    try {
        const response = await fetch(pinataUploadUrl, {
            method: 'POST',
            headers: {
                'pinata_api_key': pinataApiKey,
                'pinata_secret_api_key': pinataSecretKey,
            },
            body: data,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error response from Pinata:', errorData);
            throw new Error('Failed to upload to Pinata');
        }

        const result = await response.json();
        console.log("Uploaded to Pinata:", result.IpfsHash);
        return result.IpfsHash; // Return the IPFS hash of the uploaded file
    } catch (error) {
        console.error('Error uploading file to Pinata:', error);
        return null;
    }
}

