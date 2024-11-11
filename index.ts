import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getOrCreateUser, getUser } from './models/users.model';
import { connectDb } from './services/db.service';
import { sendMessage } from './services/openai.service';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    try {
        console.log('{!} Function HANDLER:', JSON.stringify(event));
        const method = event.requestContext.http.method;

        const pathParts = event.rawPath.split('/').filter(part => part.length);
        let route;
        if (pathParts.length) {
            route = pathParts[0];
        }
        console.log('{!} Function METHOD:', method, '{!} Function ROUTE:', route);
        try {
            await connectDb();
        } catch (error) {
            console.error('Error connecting to the database', error);
            return {
                statusCode: 500,
                body: 'Error connecting to the database',
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                body: 'Insufficient data',
            };
        }

        switch (route) {
            case 'start':
                const startPayload = JSON.parse(event.body!) as { name: string; email: string };
                if (!startPayload.name || !startPayload.email) {
                    return {
                        statusCode: 400,
                        body: 'Insufficient data',
                    };
                }

                const user = await getOrCreateUser(startPayload.name, startPayload.email);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ thread_id: user.id }),
                };
            case 'chat':
                const chatPayload = JSON.parse(event.body!) as { message: { text: string }; thread_id: string };
                console.log('BODY:', chatPayload);
                if (!chatPayload.thread_id) {
                    return {
                        statusCode: 400,
                        body: 'No thread_id',
                    };
                }
                const existingUser = await getUser(chatPayload.thread_id);
                if (!existingUser) {
                    return {
                        statusCode: 400,
                        body: 'Thread_id is invalid',
                    };
                }

                if (!chatPayload.message || !chatPayload.message.text) {
                    return {
                        statusCode: 400,
                        body: 'Insufficient data',
                    };
                }
                const response = await sendMessage(chatPayload.thread_id, chatPayload.message);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ response }),
                };
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            },
            body: '',
        };
    } catch (error: any) {
        console.log('ERROR:', error);
        console.error(error);
        return {
            statusCode: 400,
            body: JSON.stringify(error.message || error),
        };
    }
};
