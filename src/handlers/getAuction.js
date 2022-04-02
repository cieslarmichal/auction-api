import AWS from 'aws-sdk';
import { StatusCodes } from 'http-status-codes';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpEventNormalizer from '@middy/http-event-normalizer';
import createError from 'http-errors';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function getAuction(event, context) {
  let auction;

  const {id} = event.pathParameters;

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

  return {
    statusCode: StatusCodes.OK,
    body: JSON.stringify(auction),
  };
}

export const handler = middy(getAuction)
  .use(httpEventNormalizer())
  .use(httpErrorHandler());
