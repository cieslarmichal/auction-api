import AWS from 'aws-sdk';
import createError from 'http-errors';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

async function getEndedAuctions() {
    const now = new Date();

    const params = {
        TableName: process.env.AUCTIONS_TABLE_NAME,
        IndexName: 'statusAndEndDate',
        KeyConditionExpression: '#status = :status AND endingAt <= :now',
        ExpressionAttributeValues: {
            ':status': 'OPEN',
            ':now': now.toISOString(),
        },
        ExpressionAttributeNames: {
            '#status': 'status',
        },
    };

    const result = await dynamoDb.query(params).promise();

    return result.Items;
}

async function closeAuction(auction) {
    const params = {
        TableName: process.env.AUCTIONS_TABLE_NAME,
        Key: { id: auction.id },
        UpdateExpression: 'set #status = :status',
        ExpressionAttributeValues: {
            ':status': 'CLOSED'
        },
        ExpressionAttributeNames: {
            '#status': 'status'
        },
    };

    await dynamoDb.update(params).promise();

    const { title, seller, highestBid } = auction;
    const { amount, bidder } = highestBid;

    console.log(seller);
    console.log(bidder);

    const notifySeller = sqs.sendMessage({
        QueueUrl: process.env.EMAIL_QUEUE_URL,
        MessageBody: JSON.stringify({
            subject: 'Your item has been sold!',
            recipient: seller,
            body: `Your item "${title}" has been sold for $${amount}.`,
        }),
    }).promise();

    const notifyBidder = sqs.sendMessage({
        QueueUrl: process.env.EMAIL_QUEUE_URL,
        MessageBody: JSON.stringify({
            subject: 'You won an auction!',
            recipient: bidder,
            body: `You got yourself a "${title}" for $${amount}`,
        }),
    }).promise();

    return Promise.all([notifySeller, notifyBidder]);
}

async function processAuctions(event, context) {
    try {
        const auctionsToClose = await getEndedAuctions();

        const closePromises = auctionsToClose.map((auctionToClose) => closeAuction(auctionToClose));

        await Promise.all(closePromises);

        return {closed: closePromises.length};
    } catch (error) {
        console.log(error);
        throw new createError.InternalServerError(error);
    }

}

export const handler = processAuctions;