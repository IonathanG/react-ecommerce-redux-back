import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase.config";

// initialise data from firestore
export const getUserData = createAsyncThunk(
  "data/getUserData",
  async (userID) => {
    const docRef = doc(db, "users", `${userID}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      //console.log("Document data:", docSnap.data());
      const storedData = window.localStorage.state
        ? JSON.parse(localStorage.getItem("state"))
        : undefined;

      localStorage.removeItem("state");
      return { dataDB: docSnap.data(), storedData };
    } else {
      //console.log("No such document");
    }
  }
);

// initialise data from local storage
export const getGuestData = createAsyncThunk("data/getGuestData", () => {
  //console.log("guest data");
  const storedData = window.localStorage.state
    ? JSON.parse(localStorage.getItem("state"))
    : undefined;

  return storedData;
});

const initialState = {
  listItems: [],
  totalQuantity: 0,
  wishList: [],
  initUser: false,
};

export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    //add item to the cart or add quantity of an item already in the cart
    addItem: (state, { payload }) => {
      let itemFound = false;
      state.totalQuantity += payload.quantity;

      if (state.listItems.length > 0) {
        for (let i = 0; i < state.listItems.length; i++) {
          if (state.listItems[i].modelID === payload.modelID) {
            state.listItems[i].quantity += payload.quantity;
            itemFound = true;
          }
        }
      }

      if (!itemFound) {
        state.listItems.push({
          name: payload.name,
          id: payload.id,
          quantity: payload.quantity,
          price: payload.price,
          color: payload.color,
          size: payload.size,
          img: payload.img,
          modelID: payload.modelID,
        });
      }
    },

    //remove an item from the cart
    removeItem: (state, { payload }) => {
      let newArray = [];

      for (let i = 0; i < state.listItems.length; i++) {
        i !== payload
          ? newArray.push(state.listItems[i])
          : (state.totalQuantity -= state.listItems[i].quantity);
      }
      state.listItems = [...newArray];
    },

    //adding quantity to an item from the cart
    addQuantity: (state, { payload }) => {
      for (let i = 0; i < state.listItems.length; i++) {
        if (state.listItems[i].modelID === payload.modelID) {
          state.listItems[i].quantity += 1;
          state.totalQuantity += 1;
        }
      }
    },

    //removing quantity to an item from the cart
    removeQuantity: (state, { payload }) => {
      for (let i = 0; i < state.listItems.length; i++) {
        if (state.listItems[i].modelID === payload.modelID) {
          if (state.listItems[i].quantity > 1) {
            state.listItems[i].quantity -= 1;
            state.totalQuantity -= 1;
          }
        }
      }
    },

    //delete listItems
    deleteCart: (state) => {
      state.listItems = [];
      state.totalQuantity = 0;
    },

    //add to wishList
    toggleWishlistItem: (state, { payload }) => {
      let itemFound = false;
      let newArray = [];

      if (state.wishList.length > 0) {
        for (let i = 0; i < state.wishList.length; i++) {
          state.wishList[i].id !== payload.id
            ? newArray.push(state.wishList[i])
            : (itemFound = true);
        }
      }

      itemFound
        ? (state.wishList = [...newArray])
        : state.wishList.push(payload);
    },

    //reset the store on session logout
    resetStore: (state) => {
      state.listItems = [];
      state.totalQuantity = 0;
      state.wishList = [];
    },
  },

  // initialise async data from firestore
  extraReducers: {
    [getUserData.pending]: (state) => {
      state.initUser = false;
    },
    [getUserData.fulfilled]: (state, { payload }) => {
      if (payload.storedData === undefined) {
        state.listItems = payload.dataDB.listItems;
        state.totalQuantity = payload.dataDB.totalQuantity;
        state.wishList = payload.dataDB.wishList;
      } else {
        // listItems
        // merge both listItems
        // remove duplicates and add quantities of item with similar id, color and size
        if (payload.dataDB.listItems.length > 0) {
          const newListItems = [
            ...payload.dataDB.listItems,
            ...payload.storedData.listItems,
          ];

          for (let i = 0; i < newListItems.length; i++) {
            for (let j = i + 1; j < newListItems.length; j++) {
              if (newListItems[i].modelID === newListItems[j].modelID) {
                newListItems[i].quantity += newListItems[j].quantity;
                newListItems.splice(j--, 1);
              }
            }
          }
          state.listItems = newListItems;
        } else {
          state.listItems = payload.storedData.listItems;
        }
        // totalQuantity
        state.totalQuantity =
          payload.dataDB.totalQuantity + payload.storedData.totalQuantity;

        // wishList
        if (payload.dataDB.wishList.length > 0) {
          // only keeping items with different id => avoid duplicate in wishList
          let id_wishList = new Set(
            payload.dataDB.wishList.map((item) => item.id)
          );
          state.wishList = [
            ...payload.dataDB.wishList,
            ...payload.storedData.wishList.filter(
              (item) => !id_wishList.has(item.id)
            ),
          ];
        } else {
          state.wishList = payload.storedData.wishList;
        }
      }
      state.initUser = true;
    },
    [getUserData.rejected]: (state) => {
      state.initUser = false;
    },

    //initialise data from local storage
    [getGuestData.pending]: (state) => {
      state.initUser = false;
    },
    [getGuestData.fulfilled]: (state, { payload }) => {
      if (payload) {
        state.listItems = payload.listItems;
        state.totalQuantity = payload.totalQuantity;
        state.wishList = payload.wishList;
      }
      state.initUser = true;
    },
    [getGuestData.rejected]: (state) => {
      state.initUser = false;
    },
  },
});

export const {
  addItem,
  removeItem,
  addQuantity,
  removeQuantity,
  deleteCart,
  toggleWishlistItem,
  resetStore,
} = cartSlice.actions;
export default cartSlice.reducer;
