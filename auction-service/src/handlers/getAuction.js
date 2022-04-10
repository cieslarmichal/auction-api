import AWS from 'aws-sdk';
import { StatusCodes } from 'http-status-codes';
import { commonMiddleware } from '../shared';
import createError from 'http-errors';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export async function getAuctionById(id) {
  let auction;

  try {
    const result = await dynamoDb.get({TableName: process.env.AUCTIONS_TABLE_NAME, Key: { id }}).promise();

    auction = result.Item;
  } catch (error) {
    console.log(error);
    throw new createError.InternalServerError(error);
  }

  if (!auction){
    throw new createError.NotFound(`Auction with id "${id}" not found`);
  }

  return auction;
}

async function getAuction(event, context) {
  const {id} = event.pathParameters;

  const auction = await getAuctionById(id);

  return {
    statusCode: StatusCodes.OK,
    body: JSON.stringify(auction),
  };
}

export const handler = commonMiddleware(getAuction);
