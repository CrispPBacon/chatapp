import "../../styles/chat/layout.css";
import "../../styles/chat/navElements.css";
import "../../styles/chat/leftElements.css";
import "../../styles/chat/midElement.css";
import "../../styles/chat/rightElements.css";
import { lazy, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import RightHeader from "./elements/RightHeader";
import MidHeader from "./elements/MidHeader";
import NavMenu from "./elements/NavMenu";
import Inbox from "./elements/Inbox";
import LeftHeader from "./elements/LeftHeader";
import Friends from "./elements/Friends";

const MessageBox = lazy(() => import("./elements/MessageBox"));
const RightContent = lazy(() => import("./elements/RightContent"));

import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";
import { green, red } from "../../messageLogger";
import { imagesType, inboxProps, userProp } from "../../interfaces";
import SearchOutput from "./elements/SearchOutput";
import { onConnect, onDisconnect, socket } from "../../socket";
import { handleAPIRequest } from "../../context/ContextFunctions";
import PopUp from "./elements/PopUp";
import axios from "axios";
import {
  MessagesAnalytics,
  UsersAnalytics,
  UsersToday,
} from "./elements/Analytics";
import UsersController from "./elements/UsersController";

export default function ChatApp() {
  const navigate = useNavigate();
  const { id } = useParams<string>();
  const { user, logout } = useAuth();

  const { chat, selectChat, searchValue, getSearchResult } = useChat();

  const [searchResult, setSearchResult] = useState<userProp[]>([]);
  const [inbox, setInbox] = useState<inboxProps[]>([]);
  const [menu, selectMenu] = useState("CHATS");

  const [images, setImages] = useState<imagesType[]>([]);
  const [image, setImage] = useState<imagesType | null>(null);

  const inboxHandle = (data: inboxProps) => {
    setInbox((prev) => {
      const updatedInbox = [...prev];
      let exist = false;
      for (let key in updatedInbox) {
        if (updatedInbox[key].person_id === data.person_id) {
          updatedInbox[key] = data;
          exist = true;
        }
      }
      if (!exist) {
        updatedInbox.push(data);
      }
      return updatedInbox;
    });
  };

  const fetchInbox = async (user_id: string) => {
    if (user_id) {
      await handleAPIRequest("/api/rooms", { getInbox: { user_id: user_id } })
        .then((res) => {
          setInbox(res);
        })
        .catch((error) => {
          setInbox([]);
          console.log(`%c${error.message}`, red);
        });
    }
  };

  const fetchImages = async (chat_id: string) => {
    try {
      const response = await axios.post(`/api/fetch_images/${chat_id}`);
      if (response.data) {
        setImages(response.data);
      } else {
        console.error("Error: No image data found in response");
        setImages([]);
      }
    } catch (error) {
      setImages([]);
    }
  };

  const menuSelector = (menu: string) => {
    if (menu === "CHATS") {
      return <Inbox inbox={inbox} />;
    } else if (menu === "FRIENDS") {
      return <Friends />;
    } else if (menu === "ADMINPANEL") {
      return null;
    } else if (menu === "ANALYTICS") {
      return null;
    }
    return null;
  };

  useEffect(() => {
    if (user?.perms.banned) {
      logout();
      navigate("/login");
      alert("You are banned from this website");
    }

    const handleClick = () => {
      const storedData = localStorage.getItem("userdata");
      if (!storedData || user?._id !== JSON.parse(storedData)?._id) {
        logout();
        navigate("/");
      }
    };
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  useEffect(() => {
    if (user?._id) {
      fetchInbox(user._id);
    }
  }, [user]);

  useEffect(() => {
    onConnect()
      .then((res) => {
        socket.emit("join_room", user?._id);
        console.log(`%c${res}`, green);
        socket.on("new_inbox", inboxHandle);
      })
      .catch((error) => {
        console.log(`%c${error.message}`, red);
        onDisconnect();
        logout();
        socket.off("new_inbox", inboxHandle);
      });
    return () => {
      onDisconnect();
      socket.emit("leave_room", user?._id);
      socket.off("new_inbox", inboxHandle);
    };
  }, [socket]);

  useEffect(() => {
    if (id && user?._id) {
      selectChat(user._id, id).catch((error: Error) => {
        navigate("/");
        console.log(`%c ${error.message}`, red);
      });
      return () => {
        selectChat(null, null).catch(() => {
          return;
        });
      };
    }
  }, [id]);

  useEffect(() => {
    if (searchValue) {
      getSearchResult(searchValue)
        .then((res) => {
          setSearchResult(res);
        })
        .catch((error) => console.log(error.message));
    } else {
      setSearchResult([]);
    }
  }, [searchValue]);

  return (
    <>
      <div className="container">
        <section className="component nav">
          <NavMenu selectMenu={selectMenu} />
        </section>
        {menu === "ANALYTICS" ? (
          <>
            <section className="component mid" style={{ overflowY: "auto" }}>
              <h1
                style={{
                  backgroundColor: "rgba(0, 0, 0, .75)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "1rem",
                }}
              >
                Analytics
              </h1>
              <UsersToday />
              <UsersAnalytics />
              <MessagesAnalytics />
            </section>
          </>
        ) : menu === "ADMINPANEL" ? (
          <>
            <section className="component mid" style={{ overflowY: "auto" }}>
              <h1
                style={{
                  backgroundColor: "rgba(0, 0, 0, .75)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "1rem",
                }}
              >
                ADMIN DASHBOARD
              </h1>
              <UsersController />
            </section>
          </>
        ) : (
          <>
            <section className="component left">
              <LeftHeader header={menu} />
              {searchValue ? (
                <SearchOutput searchResult={searchResult} />
              ) : (
                menuSelector(menu)
              )}
            </section>
            <section className="component mid ">
              {id ? (
                <>
                  <MidHeader />
                  <MessageBox fetchImages={fetchImages} />
                </>
              ) : null}
            </section>
            <section
              className={id ? "component right" : "component right hide"}
            >
              {id ? (
                <>
                  <RightHeader />
                  <RightContent
                    images={images}
                    fetchImages={fetchImages}
                    setImage={setImage}
                  />
                </>
              ) : null}
            </section>
          </>
        )}
      </div>
      {image && chat?._id ? (
        <PopUp image={image} setImage={setImage} chat_id={chat._id} />
      ) : null}
    </>
  );
}
