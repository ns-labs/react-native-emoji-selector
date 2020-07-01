import React, { Component } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  AsyncStorage,
  FlatList
} from "react-native";
import emoji from "emoji-datasource";

export const Categories = {
  all: {
    symbol: null,
    name: "All"
  },
  history: {
    symbol: "🕘",
    name: "Recently used"
  },
  emotion: {
    symbol: "😀",
    name: "Smileys & Emotion"
  },
  people: {
    symbol: "🧑",
    name: "People & Body"
  },
  nature: {
    symbol: "🦄",
    name: "Animals & Nature"
  },
  food: {
    symbol: "🍔",
    name: "Food & Drink"
  },
  activities: {
    symbol: "⚾️",
    name: "Activities"
  },
  places: {
    symbol: "✈️",
    name: "Travel & Places"
  },
  objects: {
    symbol: "💡",
    name: "Objects"
  },
  symbols: {
    symbol: "🔣",
    name: "Symbols"
  },
  flags: {
    symbol: "🏳️‍🌈",
    name: "Flags"
  }
};

const charFromUtf16 = utf16 =>
  String.fromCodePoint(...utf16.split("-").map(u => "0x" + u));
export const charFromEmojiObject = obj => charFromUtf16(obj.unified);
const filteredEmojis = emoji.filter(e => !e["obsoleted_by"]);
const emojiByCategory = category =>
  filteredEmojis.filter(e => e.category === category);
const sortEmoji = list => list.sort((a, b) => a.sort_order - b.sort_order);
const sortEmojiByValue = list => list.sort((a, b) => b.value - a.value);
const categoryKeys = Object.keys(Categories);

const TabBar = ({ theme, activeCategory, onPress, width }) => {
  const tabSize = width / categoryKeys.length;

  return categoryKeys.map(c => {
    const category = Categories[c];
    if (c !== "all")
      return (
        <TouchableOpacity
          key={category.name}
          onPress={() => onPress(category)}
          style={{
            flex: 1,
            height: tabSize,
            borderColor: category === activeCategory ? theme : "#EEEEEE",
            borderBottomWidth: 2,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text
            style={{
              textAlign: "center",
              paddingBottom: 8,
              fontSize: tabSize - 24
            }}
          >
            {category.symbol}
          </Text>
        </TouchableOpacity>
      );
  });
};

const EmojiCell = ({ emoji, colSize, reduceEmojiSizeBy, renderValueStyle, renderValues,  ...other }) => (
  <TouchableOpacity
    activeOpacity={0.5}
    style={{
      width: colSize + reduceEmojiSizeBy,
      height: colSize + (renderValues ? 15 : 0), // to handle height of view
      alignItems: "center",
      justifyContent: "center"
    }}
    {...other}
  >
    <Text style={{ color: "#FFFFFF", fontSize: colSize - 12 }}>
      {charFromEmojiObject(emoji)}
    </Text>
    {/* added value under the emojis */}
    {renderValues && (
      <Text maxFontSizeMultiplier={1.1} style={emoji["selected"] == true ? renderValueStyle.ratingtextSelected : renderValueStyle.ratingtext}>
        {`${emoji["value"]}`}
      </Text>
    )}
  </TouchableOpacity>
);

const storage_key = "@react-native-emoji-selector:HISTORY";
export default class EmojiSelector extends Component {
  state = {
    searchQuery: "",
    category: Categories.people,
    isReady: false,
    history: [],
    emojiList: null,
    colSize: 0,
    width: 0,
    numberOfEmojis: 0, //to decide number of emogis in row
    myEmogiSelection: null, //for array of emogis to display,
    reduceEmojiSizeBy: 0 // to adjust Emogi size
  };

  //
  //  HANDLER METHODS
  //
  handleTabSelect = category => {
    if (this.state.isReady) {
      if (this.scrollview)
        this.scrollview.scrollToOffset({ x: 0, y: 0, animated: false });
      this.setState({
        searchQuery: "",
        category
      });
    }
  };

  handleEmojiSelect = (emoji, renderValues) => {

    //to save emogi in history
    if (this.props.showHistory) {
      this.addToHistoryAsync(emoji);
    }

    //to handle selected value as per myEmogiSelection array
    if (renderValues && emoji && emoji.hasOwnProperty("selected") && emoji.hasOwnProperty("value")) {
      this.state.myEmogiSelection.filter(e => {
        if (e["short_name"].includes(emoji["short_name"])) {
          if (e["selected"] == true) {
            e["selected"] = false
            e["value"] -= 1
          } else {
            e["selected"] = true
            e["value"] += 1
          }
        } else {
          if (e["selected"] == true) {
            e["selected"] = false
            e["value"] -= 1
          }
        }
      })
    }

    // sending value from lib to code
    this.props.onEmojiSelected(charFromEmojiObject(emoji), emoji, this.state.myEmogiSelection); //emogis data added here, updated array also send if needed

  };

  handleSearch = searchQuery => {
    this.setState({ searchQuery });
  };

  addToHistoryAsync = async emoji => {
    let history = await AsyncStorage.getItem(storage_key);

    let value = [];
    if (!history) {
      // no history
      let record = Object.assign({}, emoji, { count: 1 });
      value.push(record);
    } else {
      let json = JSON.parse(history);
      if (json.filter(r => r.unified === emoji.unified).length > 0) {
        value = json;
      } else {
        let record = Object.assign({}, emoji, { count: 1 });
        value = [record, ...json];
      }
    }

    AsyncStorage.setItem(storage_key, JSON.stringify(value));
    this.setState({
      history: value
    });
  };

  loadHistoryAsync = async () => {
    let result = await AsyncStorage.getItem(storage_key);
    if (result) {
      let history = JSON.parse(result);
      this.setState({ history });
    }
  };

  //
  //  RENDER METHODS
  //
  renderEmojiCell = ({ item }) => (
    <EmojiCell
      key={item.key}
      emoji={item.emoji}
      onPress={() => this.handleEmojiSelect(item.emoji, this.props.renderValues)}
      colSize={this.state.colSize}
      reduceEmojiSizeBy={this.state.reduceEmojiSizeBy}
      renderValueStyle={this.props.renderValueStyle}
      renderValues={this.props.renderValues}
    />
  );

  returnSectionData() {
    const { history, emojiList, searchQuery, category, numberOfEmojis, myEmogiSelection } = this.state;
    if (category === Categories.all && searchQuery === "") {
      //TODO: OPTIMIZE THIS
      let largeList = [];
      categoryKeys.forEach(c => {
        const name = Categories[c].name;
        const list =
          name === Categories.history.name ? history : emojiList[name];
        if (c !== "all" && c !== "history") largeList = largeList.concat(list);
      });

      return largeList.map(emoji => ({ key: emoji.unified, emoji }));
    } else {
      let list;
      const hasSearchQuery = searchQuery !== "";
      const name = category.name;
      if (hasSearchQuery) {
        const filtered = emoji.filter(e => {
          let display = false;
          e.short_names.forEach(name => {
            if (name.includes(searchQuery.toLowerCase())) display = true;
          });
          return display;
        });
        list = sortEmoji(filtered);
      } else if (name === Categories.history.name) {
        list = history;
      }else if(!myEmogiSelection && numberOfEmojis && numberOfEmojis > 0){
        //normal filteration method for emogis
        list = emojiList[name].slice(0,numberOfEmojis);
      }
      else if(myEmogiSelection && myEmogiSelection.length > 0 && numberOfEmojis && numberOfEmojis > 0){
        const filtered = emoji.filter(e => {
          let display = false;
          e.short_names.forEach(name => {
            myEmogiSelection.filter(a => {
              a.short_names.forEach(n => {
                if (name.includes(n)) 
                {
                  if(name == n){
                    e["selected"] = a['selected'] // to add selected action in array
                    e["value"] = a['value'] // to add selected value in array not selected then 0 or 1 if selected
                    e["code"] = a['code'] // to add code in array
                    display = true;
                  }
                }
              })
            })
          });
          return display;
        });
        list = sortEmojiByValue(filtered).slice(0,numberOfEmojis);
      }
      else {
        if(myEmogiSelection && myEmogiSelection.length == 0){
          list = [];
          this.setState({ isReady: false });
        }else{
          list = emojiList[name];
        }
      }
      return list.map(emoji => ({ key: emoji.unified, emoji }));
    }
  }

  prerenderEmojis(callback) {
    let emojiList = {};
    categoryKeys.forEach(c => {
      let name = Categories[c].name;
      emojiList[name] = sortEmoji(emojiByCategory(name));
    });

    this.setState(
      {
        emojiList,
        colSize: Math.floor((this.state.width / this.props.columns)-(this.props.reduceEmojiSizeBy)),
        reduceEmojiSizeBy: Math.floor(this.props.reduceEmojiSizeBy)
      },
      callback
    );
  }

  handleLayout = ({ nativeEvent: { layout } }) => {
    this.setState({ width: layout.width }, () => {
      this.prerenderEmojis(() => {
        this.setState({ isReady: true });
      });
    });
  };

  //
  //  LIFECYCLE METHODS
  //
  componentDidMount() {
    const { category, showHistory, numberOfEmojis, myEmogiSelection } = this.props;
    this.setState({ category, numberOfEmojis, myEmogiSelection });

    if (showHistory) {
      this.loadHistoryAsync();
    }
  }

  componentDidUpdate() {
    const { myEmogiSelection } = this.props;
    if(myEmogiSelection != null && this.state.myEmogiSelection != myEmogiSelection){
      this.setState({ myEmogiSelection });
    }
  }

  render() {
    const {
      theme,
      columns,
      placeholder,
      showHistory,
      showSearchBar,
      showSectionTitles,
      showTabs,
      scrollHorizontal,
      scrollEnabled,
      adjustRows, // props passing if there is selection array or to take default one to manage ui
      ...other
    } = this.props;

    const { category, colSize, isReady, searchQuery } = this.state;

    const Searchbar = (
      <View style={styles.searchbar_container}>
        <TextInput
          style={styles.search}
          placeholder={placeholder}
          clearButtonMode="always"
          returnKeyType="done"
          autoCorrect={false}
          underlineColorAndroid={theme}
          value={searchQuery}
          onChangeText={this.handleSearch}
        />
      </View>
    );

    const title = searchQuery !== "" ? "Search Results" : category.name;

    return (
      <View style={ adjustRows ? styles.handledFrame : styles.frame } {...other} onLayout={this.handleLayout}>
        <View style={styles.tabBar}>
          {showTabs && (
            <TabBar
              activeCategory={category}
              onPress={this.handleTabSelect}
              theme={theme}
              width={this.state.width}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          {showSearchBar && Searchbar}
          {isReady ? (
            <View style={{ flex: 1 }}>
              <View style={styles.container}>
                {showSectionTitles && (
                  <Text style={styles.sectionHeader}>{title}</Text>
                )}
                <FlatList
                  style={styles.scrollview}
                  contentContainerStyle={{ paddingBottom: colSize }}
                  data={this.returnSectionData()}
                  renderItem={this.renderEmojiCell}
                  numColumns={ scrollHorizontal ? 1 : columns}
                  keyboardShouldPersistTaps={"always"}
                  ref={scrollview => (this.scrollview = scrollview)}
                  removeClippedSubviews
                  horizontal={scrollHorizontal ? true : false}
                  scrollEnabled={scrollEnabled}
                />
              </View>
            </View>
          ) : (
            <View style={styles.loader} {...other}>
              <ActivityIndicator
                size={"large"}
                color={Platform.OS === "android" ? theme : "#000000"}
              />
            </View>
          )}
        </View>
      </View>
    );
  }
}

EmojiSelector.defaultProps = {
  theme: "#007AFF",
  category: Categories.all,
  showTabs: true,
  showSearchBar: true,
  showHistory: false,
  showSectionTitles: true,
  columns: 6,
  placeholder: "Search...",
  scrollHorizontal: false,
  numberOfEmojis: null,
  myEmogiSelection: null,
  scrollEnabled: true,
  reduceEmojiSizeBy: 0,
  adjustRows: false,
  renderValues: false
};

const styles = StyleSheet.create({
  frame: {
    flex: 1
  },
  handledFrame: {
    height: "55%",
    width: "100%",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  tabBar: {
    flexDirection: "row"
  },
  scrollview: {
    flex: 1
  },
  searchbar_container: {
    width: "100%",
    zIndex: 1,
    backgroundColor: "rgba(255,255,255,0.75)"
  },
  search: {
    ...Platform.select({
      ios: {
        height: 36,
        paddingLeft: 8,
        borderRadius: 10,
        backgroundColor: "#E5E8E9"
      }
    }),
    margin: 8
  },
  container: {
    flex: 1,
    flexWrap: "wrap",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  sectionHeader: {
    margin: 8,
    fontSize: 17,
    width: "100%",
    color: "#8F8F8F"
  }
});
