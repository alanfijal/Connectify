from dotenv import load_dotenv
import os 
from .prompt import conversation_agent_prompt

from langchain import hub 
from langchain_openai import AzureChatOpenAI, AzureOpenAIEmbeddings
from langchain.agents import Tool, AgentExecutor, create_openai_tools_agent
from langchain.globals import set_debug, set_verbose
from langchain.prompts import ChatPromptTemplate
from langchain_qdrant import Qdrant

from tavily import TavilyClient
from qdrant_client import QdrantClient

load_dotenv()


class Retriever:
    def __init__(self):
        self.smart_llm = AzureChatOpenAI(
            model="gpt-4o-mini",
            deployment_name=os.getenv("AZURE_OPENAI_DEPLOYMENT"),
            temperature=0.2,
            streaming=True,
            api_version=os.getenv("OPENAI_API_VERSION"))

        self.embeddings_model = AzureOpenAIEmbeddings(
            model="text-embedding-ada-002",
            azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_ADA"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT_ADA"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION_ADA"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY_ADA")
        )
        set_debug(True)
        set_verbose(True)
    
    def prompt_template(self):
        base_prompt = ChatPromptTemplate.from_messages(conversation_agent_prompt)
        functions_prompt = hub.pull("langchain-ai/openai-functions-template")
        prompt_template = functions_prompt.partial(instructions=base_prompt)
        return prompt_template
    
    #qdrant_tool right now empty because no data is stored in qdrant yet
    def set_qdrant_tool(self):
        client = QdrantClient("localhost", port=6333)
        embeddings = self.embeddings_model

        qdrant = Qdrant(
            client=client,
            collection_name=os.getenv("QDRANT_COLLECTION_NAME"),
            embeddings=embeddings
        )

        retriever = qdrant.as_retriever()
        return Tool(name="qdrant_search", func=retriever.get_relevant_documents, description="Search for relevant documents in the qdrant database")

    def set_web_search_tool(self):
        tavily_key = os.getenv("TAVILY_API_KEY")
        tavily_client = TavilyClient(api_key=tavily_key)

        def tavily_search(query: str) -> str:
            try:
                search_result = tavily_client.search(query, search_depth="basic")
                formatted_result = "\n".join([f"- {result['title']}: {result['content']}" 
                                              for result in search_result['results'][:3]])
                return formatted_result
            except Exception as e:
                return f"Error during web search: {str(e)}"
        
        return Tool(name="web_search", func=tavily_search, description="Search the web for relevant information")

    def set_agent(self):
        qdrant_tool = self.set_qdrant_tool()
        web_search_tool = self.set_web_search_tool()
        tools = [web_search_tool]
        agent = create_openai_tools_agent(self.smart_llm, tools, self.prompt_template())
        return AgentExecutor(agent=agent, tools=tools, return_intermediate_steps=True, verbose=True)


    def process_conversation(self, user_prompt, conversation_history):
        try:
            agent_executor = self.set_agent()

            
            last_message = None
            for msg in reversed(conversation_history):
                if msg['role'] == 'user':
                    last_message = msg['content']
                    break

          
            formatted_conversation = "\n".join([
                f"{msg['role']}: {msg['content']}" 
                for msg in conversation_history
            ])

            input_text = (
                f"Last message: '{last_message}'\n"
                f"User request: {user_prompt}\n\n"
                f"Full conversation context:\n{formatted_conversation}"
            )

            response = agent_executor.invoke({
                "input": input_text,
                "conversation": formatted_conversation
            })
            return response["output"]

        except Exception as e:
            print(f"Agent processing error: {str(e)}")
            return "I apologize, but I encountered an error processing your request."
