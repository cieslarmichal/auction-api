import AWS from 'aws-sdk';
import { StatusCodes } from 'http-status-codes';
import { commonMiddleware, placeBidSchema } from '../shared';
import createError from 'http-errors';
import { getAuctionById } from './getAuction';
import validator from '@middy/validator';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function placeBid(event, context) {
  const { id } = event.pathParameters;

  const { amount } = event.body;

  const { email } = event.requestContext.authorizer;

  const auction = await getAuctionById(id);

  if (auction.status === 'CLOSED') {
    throw new createError.UnprocessableEntity(`Bid cannot be placed on closed auction`);
  }

  if (amount <= auction.highestBid.amount) {
    throw new createError.UnprocessableEntity(`Bid is not higher than ${auction.highestBid.amount}`);
  }

  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id },
    UpdateExpression: 'set highestBid.amount = :amount, highestBid.bidder = :bidder',
    ExpressionAttributeValues: {
      ':amount': amount,
      ':bidder': email,
    },
    ReturnValues: 'ALL_NEW',
  };

  try {
    const result = await dynamoDb.update(params).promise();

    const updatedAuction = result.Attributes;

    return {
      statusCode: StatusCodes.CREATED,
      body: JSON.stringify(updatedAuction),
    };
  } catch (error) {
    console.log(error);
    throw new createError.InternalServerError(error);
  }
}

export const handler = commonMiddleware(placeBid).use(
  validator({
    inputSchema: placeBidSchema,
    ajvOptions: {
      strict: false,
    },
  })
);
