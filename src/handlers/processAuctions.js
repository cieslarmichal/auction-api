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

    const { highestBid } = auction;
    const { amount } = highestBid;

    if (amount === 0){
        await notifySellerAboutNotSoldItem(auction);
        return;
    }

    const notifySellerAction = notifySellerAboutSoldItem(auction);

    const notifyBidderAction = notifyBidder(auction);

    return Promise.all([notifySellerAction, notifyBidderAction]);
}

async function notifySellerAboutNotSoldItem(auction) {
    const { title, seller } = auction;

    const subjectForSeller = 'No bids on your auction item';

    const bodyForSeller = `Your item "${title}" didn't get any bids.`;

    return notifyByEmail(subjectForSeller, seller, bodyForSeller);
}

async function notifySellerAboutSoldItem(auction) {
    const { title, seller, highestBid } = auction;
    const { amount } = highestBid;

    const subjectForSeller = 'Your item has been sold!';

    const bodyForSeller = `Your item "${title}" has been sold for $${amount}.`;

    return notifyByEmail(subjectForSeller, seller, bodyForSeller);
}

async function notifyBidder(auction) {
    const { title, highestBid } = auction;
    const { amount, bidder } = highestBid;

    const subjectForBidder = 'You won an auction!';

    const bodyForBidder = `You got yourself a "${title}" for $${amount}`;

    return notifyByEmail(subjectForBidder, bidder, bodyForBidder);
}

async function notifyByEmail(subject, recipient, body) {
    return sqs.sendMessage({
        QueueUrl: process.env.EMAIL_QUEUE_URL,
        MessageBody: JSON.stringify({
            subject,
            recipient,
            body,
        }),
    }).promise();
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