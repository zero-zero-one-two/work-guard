import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { API_BASE_URL } from '@/constants/api';

type Message =
  | { id: string; type: 'user' | 'bot'; text: string }
  | { id: string; type: 'analysis'; text: string }
  | { id: string; type: 'quick-reply' }
  | { id: string; type: 'loading' };

const BOT_HELLO = '안녕하세요! 한국 노동법에 관해 무엇이든 물어보세요.';

export default function ChatScreen() {
  const { category, initialMessage } = useLocalSearchParams<{ category?: string; initialMessage?: string }>();

  const startMessages: Message[] = initialMessage
    ? [
        { id: '1', type: 'bot', text: BOT_HELLO },
        { id: '2', type: 'user', text: initialMessage },
      ]
    : [{ id: '1', type: 'bot', text: BOT_HELLO }];

  const [messages, setMessages] = useState<Message[]>(startMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // initialMessage가 있으면 자동으로 봇 응답 요청
  useEffect(() => {
    console.log('[chat] initialMessage:', initialMessage);
    console.log('[chat] API_BASE_URL:', API_BASE_URL);
    if (initialMessage) {
      fetchBotReply([{ role: 'user' as const, content: initialMessage }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchBotReply(history: { role: 'user' | 'assistant'; content: string }[]) {
    setLoading(true);
    const loadingId = `loading-${Date.now()}`;
    setMessages(prev => [...prev, { id: loadingId, type: 'loading' }]);
    try {
      const res = await fetch(`${API_BASE_URL}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      const reply = data.reply ?? '응답을 가져오지 못했어요.';
      setMessages(prev => [
        ...prev.filter(m => m.id !== loadingId),
        { id: Date.now().toString(), type: 'bot', text: reply },
      ]);
    } catch (err: any) {
      console.error('[chat] fetchBotReply 오류:', err?.message, err);
      setMessages(prev => [
        ...prev.filter(m => m.id !== loadingId),
        { id: Date.now().toString(), type: 'bot', text: '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const trimmed = text.trim();
    const userMsg: Message = { id: Date.now().toString(), type: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // 현재 대화 히스토리 구성
    const history = [...messages, userMsg]
      .filter((m): m is { id: string; type: 'user' | 'bot'; text: string } =>
        m.type === 'user' || m.type === 'bot'
      )
      .map(m => ({ role: (m.type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', content: m.text }));

    fetchBotReply(history);
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

    if (item.type === 'loading') {
      return (
        <View style={styles.rowLeft}>
          <View style={styles.bubbleBot}>
            <ActivityIndicator size="small" color="#9BA1A6" />
          </View>
        </View>
      );
    }

    if (item.type === 'quick-reply') {
      return null;
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
          <TouchableOpacity
            style={[styles.sendButton, loading && { opacity: 0.5 }]}
            onPress={() => sendMessage(input)}
            disabled={loading}>
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
