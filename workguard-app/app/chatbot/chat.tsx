import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';

type Message =
  | { id: string; type: 'user' | 'bot'; text: string }
  | { id: string; type: 'analysis'; text: string }
  | { id: string; type: 'quick-reply' };

const QUICK_REPLIES = ['Show me the law', "Calculate what I'm owed", '...'];

const INITIAL_MESSAGES: Message[] = [
  { id: '1', type: 'bot', text: 'Hello! Ask me anything about working in Korea.' },
  { id: '2', type: 'user', text: 'Can you check my contract?' },
  { id: '3', type: 'analysis', text: 'I checked your contract. There are some issues you should be aware of regarding your working hours and overtime pay.' },
  { id: '4', type: 'quick-reply' },
];

export default function ChatScreen() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), type: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
  }

  function renderItem({ item }: { item: Message }) {
    if (item.type === 'user') {
      return (
        <View style={styles.rowRight}>
          <View style={styles.bubbleUser}>
            <Text style={styles.bubbleUserText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    if (item.type === 'bot') {
      return (
        <View style={styles.rowLeft}>
          <View style={styles.bubbleBot}>
            <Text style={styles.bubbleBotText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    if (item.type === 'analysis') {
      return (
        <View style={styles.rowLeft}>
          <View style={styles.analysisCard}>
            <Text style={styles.analysisText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    if (item.type === 'quick-reply') {
      return (
        <View style={styles.quickReplyRow}>
          {QUICK_REPLIES.map(label => (
            <TouchableOpacity
              key={label}
              style={styles.quickReplyBtn}
              onPress={() => label === '...' ? router.push('/chatbot/get-help' as any) : sendMessage(label)}>
              <Text style={styles.quickReplyText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#11181C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category ?? 'Ask Buddy'}</Text>
        <View style={styles.backButton} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type your question."
            placeholderTextColor="#9BA1A6"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage(input)}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendButton} onPress={() => sendMessage(input)}>
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowLeft: {
    alignItems: 'flex-start',
  },
  bubbleUser: {
    backgroundColor: Brand.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '75%',
  },
  bubbleUserText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleBot: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleBotText: {
    color: '#11181C',
    fontSize: 14,
    lineHeight: 20,
  },
  analysisCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: '85%',
  },
  analysisText: {
    color: '#92400E',
    fontSize: 13,
    lineHeight: 19,
  },
  quickReplyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'flex-start',
  },
  quickReplyBtn: {
    borderWidth: 1,
    borderColor: Brand.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  quickReplyText: {
    fontSize: 13,
    color: Brand.primary,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: Brand.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#11181C',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
