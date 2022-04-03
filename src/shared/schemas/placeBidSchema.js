export const placeBidSchema = {
    type: 'object',
    properties: {
      body: {
        properties: {
          amount: {
            type: 'number',
          },
        },
        required: ['amount'],
      },
    },
    required: ['body'],
  };
