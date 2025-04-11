import os
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage
from langchain_core.messages import AIMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import START, MessagesState, StateGraph
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
import uuid


try:
    if not os.environ.get("OPENAI_API_KEY"):
        os.environ["OPENAI_API_KEY"] = os.getenv('OPENAI_API_KEY_CHATBOT')
    if not os.environ.get("LANGSMITH_API_KEY"):
        os.environ["LANGSMITH_API_KEY"] = os.getenv('LANGSMITH_API_KEY_CHATBOT')
    os.environ["LANGSMITH_TRACING"] = "true"
except Exception as e:
    print(f"Erreur lors du chargement des clés API: {e}")
    exit(1)


try:
    model = init_chat_model("gpt-4o-mini", model_provider="openai")
except Exception as e:
    print(f"Erreur lors de l'initialisation du modèle: {e}")
    exit(1)

prompt_template = ChatPromptTemplate.from_messages([
    ("system", "You talk like a phisical library owner, you have "),
    ("system", "you have some books in the phisical library and some e-books in mind"),
    ("system", "talk only in french"),
    MessagesPlaceholder(variable_name="messages"),
])

workflow = StateGraph(state_schema=MessagesState)

def call_model(state: MessagesState):
    try:
        prompt = prompt_template.invoke(state)
        response = model.invoke(prompt)
        return {"messages": response}
    except Exception as e:
        print(f"\n[Erreur pendant l'invocation du modèle]: {e}")
        return {"messages": AIMessage(content="Désolé, une erreur est survenue. Veuillez réessayer.")}

workflow.add_edge(START, "model")
workflow.add_node("model", call_model)

memory = MemorySaver()
app = workflow.compile(checkpointer=memory)
config = {"configurable": {"thread_id": str(uuid.uuid4())}}

######################" App Start ######################"
while True:
    try:
        query = input("\nYou : ")
        if query.lower() == "exit":
            print("Goodbye! It was a blast chatting with you!")
            break
        input_messages = [HumanMessage(query)]
        for chunk, metadata in app.stream({"messages": input_messages}, config, stream_mode="messages"):
            if isinstance(chunk, AIMessage):
                print(chunk.content, end="")
    except Exception as e:
        print(f"\n[Erreur générale]: {e}")