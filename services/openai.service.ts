import OpenAI from 'openai';
import { createMessage, getAllMessages } from '../models/message.model';
import { searchIndex } from './embedder.service';
const openai = new OpenAI();
const instructions =
    "You are a customer support assistant for TechEase Solutions, a company that provides comprehensive IT services to businesses. Your role is to assist our clients with their technical issues, answer questions about our services, and provide guidance on using our products effectively. Always respond in a friendly, professional manner, and ensure your explanations are clear and concise. If you're unable to resolve an issue immediately, reassure the customer that you will escalate the problem and follow up promptly. Your goal is to provide exceptional support and ensure customer satisfaction.";
const systemInstruction = {
    role: 'system',
    content: instructions,
};

export async function sendMessage(threadId: string, content: { text: string }) {
    console.log('sendMessage', threadId, JSON.stringify(content));
    const query = content.text;
    let responseText = 'Sorry, I am not able to understand your query. Please try again.';
    await createMessage({
        thread_id: threadId,
        role: 'user',
        content: query,
    });
    const dbMessages: any[] = (await getAllMessages(threadId)).map(message => {
        const formattedMessage: any = {
            role: message.role,
            content: message.content,
        };
        if (message.tool_calls) {
            formattedMessage.tool_calls = message.tool_calls;
        }
        if (message.tool_call_id) {
            formattedMessage.tool_call_id = message.tool_call_id;
        }
        return formattedMessage;
    });

    const messages: any[] = [systemInstruction, ...dbMessages];
    const message = await createCompletion(messages);
    console.log('Response:', message);

    if (message.tool_calls && message.tool_calls.length) {
        messages.push(message);
        await createMessage({
            thread_id: threadId,
            role: 'assistant',
            content: '',
            tool_calls: message.tool_calls,
        });

        for (const toolCall of message.tool_calls) {
            if (toolCall.function && toolCall.function.name === 'getContext') {
                console.log('Tool call:', toolCall);
                const functionArgs = JSON.parse(toolCall.function.arguments);
                const context = await getContext(functionArgs.question);
                // console.log('Context:', context);
                const responseMessage = {
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: context,
                };
                await createMessage({
                    thread_id: threadId,
                    role: 'tool',
                    content: context,
                    tool_call_id: toolCall.id,
                });
                // console.log('Tool response message:', responseMessage);
                messages.push(responseMessage);
            }
        }
        // console.log('Messages:', messages);
        // console.log(messages.slice(-4));

        const response = await createCompletion(messages);
        responseText = response.content!;
    } else {
        responseText = message.content!;
    }

    if (message.content) {
        await createMessage({
            thread_id: threadId,
            role: 'assistant',
            content: message.content,
        });
        console.log('Answer:', message.content);
        responseText = message.content;
    }

    return { content: responseText };
}

async function getContext(query: string) {
    const embeddingResult = await embed(query);
    const matches = (await searchIndex(embeddingResult[0].embedding)).matches;

    return matches.length ? matches.map(match => match.metadata!.content).join('\n\n') : '';
}

async function createCompletion(messages: any[]) {
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        tools: [
            {
                type: 'function',
                function: {
                    name: 'getContext',
                    description: "Retrieves the relevant context to answer the user's IT/software related query.",
                    parameters: {
                        type: 'object',
                        properties: {
                            question: {
                                type: 'string',
                                description: "The user's query about IT or software that requires the additional context.",
                            },
                        },
                        required: ['question'],
                        additionalProperties: false,
                    },
                },
            },
        ],
        tool_choice: 'auto',
    });

    const message = completion.choices[0].message;
    return message;
}

export async function embed(input: string) {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input,
    });
    // console.log(response);

    return response.data;
}
