const ai = require('ai');
const aiReact = require('@ai-sdk/react');

console.log('Exports from "ai":', Object.keys(ai));
console.log('Exports from "@ai-sdk/react":', Object.keys(aiReact));

try {
    const { useChat } = aiReact;
    console.log('useChat is type:', typeof useChat);
} catch (e) {
    console.error('Error accessing useChat:', e);
}
