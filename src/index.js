import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './index.css';
//Lets us import key PubNub Fucntions
import PubNubReact from 'pubnub-react';
//Material UI Components
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import Input from '@material-ui/core/Input';

//Usernames based on time joined
const now = new Date().getTime();
const username = ['user', now].join('-');


// Our main Component, the parent to all the others, the one class to rule them all.
class ChatApp extends Component{
  constructor(props){
    super(props);
    //Setting up our PubNub object with our pub/sub keys and setting our uuid to our username
    this.pubnub = new PubNubReact({
      //pubnub keys
      publishKey: "pub-c-3d9e1e51-bbaf-4286-847d-199729a3ce5d",
      subscribeKey: "sub-c-d32fe452-6acf-11e9-b514-6a4d3cd75da8",
      uuid: username
    });

    //Set a default channel incase someone navigates to the base url without
    //specificfying a channel name parameter.
    let defaultChannel = "Global"

    //Access the parameters provided in the URL
    let query = window.location.search.substring(1);
    let params = query.split("&");
    for(let i = 0; i < params.length;i++){
      var pair = params[i].split("=");
      //If the user input a channel then the default channel is now set
      //If not, we still navigate to the default channel.
      if(pair[0] === "channel" && pair[1] !== ""){
        defaultChannel = decodeURI(pair[1])
      }
    }

    //Setting the state varibales for the rest of the code.
    //Array of messages
    //the channel name that we will use
    //newMessage  and newChannel are the ones that the user is currently typing
    this.state = {
      messages: [],
      channelName: defaultChannel,
      newMessage: "",
      newChannel: "",
    }

    //Make sure to init PubNub after setting the state variables above
    this.pubnub.init(this);
  }
  //This is only run at the beginning, it sets up PubNub
  componentDidMount() {
    this.setUpPubNub();
  }
  //Run at the end, when the component is about to close, not when it is updated.
  componentWillUnmount() {
    this.shutDownPubNub();
  }
  //Channel Name Change functions
  handleChannelChange= (event) => {
    this.setState({newChannel: event.target.value});
  }
  handleNewChannelName = (event) => {
    if (event.key === 'Enter') {
      //Navigates to new channels
      let newURL = "";
      if(this.state.newChannel){
        newURL = window.location.origin + "?channel=" + this.state.newChannel;
      }else{
        //If the user didnt put anything into the channel Input
        newURL = window.location.origin;
      }
      window.location.href = newURL;

    }
  }
  //Handle new message functions
  handleMessageChange = (event) => {
    this.setState({ newMessage: event.target.value });
  }
  handleNewMessage = (event) =>{
    if (event.key === 'Enter') {
      this.publishMessage();
    }
  }
  //Set Up and Shut down pubnub functions
   setUpPubNub = () => {
     //Subscribes to the channelName in our state
    this.pubnub.subscribe({
        channels: [this.state.channelName],
        withPresence: true
    });
    //Our message event handler - adds in every message we receive to our messages state
    this.pubnub.getMessage(this.state.channelName, (msg) => {
        console.log("Message Received: ",msg);
        if(msg.message.text != null){
          let messages = this.state.messages;
          messages.push(
            <Message key={ this.state.messages.length } uuid={ msg.message.uuid } text={ msg.message.text }/>
          );
          this.setState({
              messages: messages
          });
        }

    });
    //Gets the last 10 messages when someone loads the page, ENABLE STORAGE &
    //PLAYBACK IN YOUR KEYS TO MAKE THIS WORK.
    this.pubnub.history(
    {
        channel: this.state.channelName,
        count: 10, // 100 is the default
        stringifiedTimeToken: true // false is the default
    },(status, response) => {

        let messages = this.state.messages;
        let i;
        for (i  = 0; i < response.messages.length;i++){
          console.log();
          messages.push(
            <Message key={ this.state.messages.length } uuid={ response.messages[i].entry.uuid } text={ response.messages[i].entry.text }/>
          );
        }
        this.setState({
            messages: messages
        });
      }
    );
  }
  //Stopping the PubNub connection and clearing the messages
  shutDownPubNub = () => {
    this.pubnub.unsubscribe({
        channels: [this.state.channelName]
    });
    this.setState({messages: []});
  }
  //Publishing messages via PubNub
   publishMessage = () => {
    if (this.state.newMessage) {
      let messageObject = {
        text: this.state.newMessage,
        uuid: username
      };
      this.pubnub.publish({
        message: messageObject,
        channel: this.state.channelName
      })
      this.setState({ newMessage: '' })
    }
  }

  //This is our render function, it returns how our page will look, including
  //many components to help organize our page. We can also pass information down
  //To our children which is useful for our ChatLog Component.
  render(){
    return(
      <Card className={this.props.card}>
          <CardContent>
            <div className="top">
              <Typography variant="h4" inline >
                PubNub React Chat
                </Typography>
              <Input
                className="channel"
                placeholder ={this.state.channelName}
                onKeyDown={this.handleNewChannelName}
                onChange={this.handleChannelChange}
                disableUnderline={true}
              />
            </div>
            <div className={this.props.root}>
              <ChatLog messages={this.state.messages}/>
            </div>
          </CardContent>
          <CardActions>
            <Input
              placeholder="Enter a message"
              fullWidth={true}
              value={this.state.newMessage}
              className={this.props.input}
              onKeyDown={this.handleNewMessage}
              onChange={this.handleMessageChange}
              inputProps={{
                'aria-label': 'Description',
              }}
              autoFocus={true}
            />
            <Button
              size="small"
              color="primary"
              onClick={this.publishMessage}>
              Submit
            </Button>

          </CardActions>
        </Card>
      );
    }

}

//Simple componentthat renders the chat log
class ChatLog extends Component{

  render(){
    return(
      <List component="nav">
        <ListItem>
        <Typography component="div">
          { this.props.messages }
        </Typography>
        </ListItem>
      </List>
    )
  }
}

//Our message commponent that formats each message.
class Message extends Component{
  render () {
    return (
      <div >
        { this.props.uuid }: { this.props.text }
      </div>
    );
  }
};

//Render our ChatApp, and now our app is on the page!
ReactDOM.render(<ChatApp />, document.getElementById('root'));
