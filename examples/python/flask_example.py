"""
Flask example using fayda-sdk

Run: FAYDA_CLIENT_ID=... FAYDA_PRIVATE_KEY=... python flask_example.py
Then visit http://localhost:5000
"""

import os
from flask import Flask, redirect, request, session
from fayda_sdk import FaydaClient

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-key-only")

client = FaydaClient(
    client_id=os.environ["FAYDA_CLIENT_ID"],
    private_key_b64=os.environ["FAYDA_PRIVATE_KEY"],
    redirect_uri="http://localhost:5000/auth/callback",
)


@app.route("/")
def index():
    return """
    <h1>Fayda Login Demo</h1>
    <a href="/login">Login with Fayda ID</a>
    """


@app.route("/login")
def login():
    result = client.auth.get_authorization_url()
    session["fayda_state"] = result.state
    session["fayda_verifier"] = result.code_verifier
    return redirect(result.url)


@app.route("/auth/callback")
def callback():
    try:
        user = client.userinfo.get_from_code(
            code=request.args["code"],
            state=request.args["state"],
            expected_state=session["fayda_state"],
            code_verifier=session["fayda_verifier"],
        )
        session["user"] = {"name": user.name, "sub": user.sub, "email": user.email}
        return redirect("/dashboard")
    except Exception as e:
        return f"Error: {e}", 400


@app.route("/dashboard")
def dashboard():
    user = session.get("user")
    if not user:
        return redirect("/")
    return f"""
    <h1>Dashboard</h1>
    <p>Welcome, {user.get('name', 'User')}!</p>
    <p>Email: {user.get('email', 'N/A')}</p>
    <p>Sub (User ID): {user.get('sub', 'N/A')}</p>
    <a href="/logout">Logout</a>
    """


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")


if __name__ == "__main__":
    app.run(debug=True)
