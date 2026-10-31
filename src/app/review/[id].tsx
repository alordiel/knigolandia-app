import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

import { OfflineBanner } from '@/components/offline-banner';
import { FontFamily, type Palette } from '@/constants/theme';
import { useOnline } from '@/hooks/use-online';
import { OfflineUnavailableError, useCoverSrc, useRelated, useReview } from '@/hooks/use-review';
import { useTheme } from '@/hooks/use-theme';
import { coverUrl, names, useCatalog, type Book } from '@/lib/catalog';
import { SITE_URL } from '@/lib/config';
import { goHome } from '@/lib/home';
import { fetchPostIdBySlug } from '@/lib/review-api';
import {
  buildReviewHtml,
  relatedHtml,
  type ActionState,
  type RelatedBook,
  type ReviewMessage,
} from '@/lib/review-html';
import { useLists } from '@/stores/lists';
import { FONT_SIZES, useSettings } from '@/stores/settings';

const BASE_URL = `${SITE_URL}/`;

// react-native-webview defaults its extra-props generic to `undefined`, which TS 6 reduces to `never`.
type NoExtraProps = Record<never, never>;
const ReviewWebView = WebView<NoExtraProps>;

export default function ReviewScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const catalog = useCatalog((s) => s.catalog);
  const catalogStatus = useCatalog((s) => s.status);
  const book = useCatalog((s) => s.byId.get(id));
  const review = useReview(id, online);
  const cover = useCoverSrc(book, online);
  const related = useRelated(id, online);

  const bookmarked = useLists((s) => s.bookmarks.includes(id));
  const wished = useLists((s) => s.wishlist.includes(id));
  const savedForLater = useLists((s) => s.readLater.includes(id));
  const toggle = useLists((s) => s.toggle);
  const toggleReadLater = useLists((s) => s.toggleReadLater);
  const fontSize = useSettings((s) => s.fontSize);
  const setFontSize = useSettings((s) => s.setFontSize);

  const [saving, setSaving] = useState(false);
  // The document is built once with the size at mount; later changes are injected without a reload.
  const [initialFontSize] = useState(fontSize);
  const webRef = useRef<WebView<NoExtraProps>>(null);

  const html = useMemo(() => {
    if (!book || !catalog || !review.data || !cover.isFetched) return null;
    return buildReviewHtml({
      meta: {
        book,
        authors: names(catalog.authors, book.author_id),
        translators: names(catalog.translators, book.translator_id),
        genres: names(catalog.genres, book.genre_id),
        publisher: names(catalog.publishers, [book.publisher_id])[0],
        coverSrc: cover.data ?? null,
        date: review.data.date,
      },
      content: review.data.html,
      online,
      colors,
      fontSize: initialFontSize,
    });
  }, [book, catalog, review.data, cover.isFetched, cover.data, online, colors, initialFontSize]);

  const toRelated = (books: Book[]): RelatedBook[] =>
    books.map((b) => ({
      id: b.id,
      title: b.title,
      author: names(catalog?.authors, b.author_id).join(', '),
      coverSrc: coverUrl(b, 'thumb'),
    }));

  const actions: ActionState = {
    bookmarks: bookmarked,
    wishlist: wished,
    readLater: saving ? 'busy' : savedForLater,
  };
  const pageState = JSON.stringify({
    actions,
    fontSize,
    related: relatedHtml(toRelated(related.sameAuthor), toRelated(related.similar)),
  });

  const applyState = () =>
    webRef.current?.injectJavaScript(`window.__apply && window.__apply(${pageState}); true;`);

  useEffect(() => {
    webRef.current?.injectJavaScript(`window.__apply && window.__apply(${pageState}); true;`);
  }, [pageState]);

  const onMessage = async (event: WebViewMessageEvent) => {
    const msg = JSON.parse(event.nativeEvent.data) as ReviewMessage;
    if (msg.type === 'open') {
      router.push({ pathname: '/review/[id]', params: { id: String(msg.id) } });
    } else if (msg.action === 'readLater') {
      if (!book || saving) return;
      setSaving(true);
      try {
        await toggleReadLater(book);
      } catch {
        Alert.alert('Неуспешно запазване', 'Проверете връзката с интернет и опитайте отново.');
      } finally {
        setSaving(false);
      }
    } else {
      toggle(msg.action, id);
    }
  };

  const onShouldStartLoad = (req: ShouldStartLoadRequest) => {
    const { url } = req;
    // Initial document load, in-page anchors, and embeds inside iframes.
    if (url.split('#')[0] === BASE_URL || url.startsWith('about:') || url.startsWith('data:')) return true;
    if (req.isTopFrame === false) return true;
    openLink(url);
    return false;
  };

  const onShare = () => {
    const url = review.data?.link ?? `${SITE_URL}/?p=${id}`;
    // Only the review's page URL. iOS shares `url` as a link; Android only reads `message`.
    Share.share(Platform.OS === 'ios' ? { url } : { message: url });
  };

  const onTextSize = () => {
    const i = FONT_SIZES.indexOf(fontSize as (typeof FONT_SIZES)[number]);
    setFontSize(FONT_SIZES[(i + 1) % FONT_SIZES.length]);
  };

  let body: React.ReactNode;
  if (html) {
    body = (
      <ReviewWebView
        ref={webRef}
        style={styles.web}
        originWhitelist={['*']}
        source={{ html, baseUrl: BASE_URL }}
        onMessage={onMessage}
        onLoadEnd={applyState}
        onShouldStartLoadWithRequest={onShouldStartLoad}
        setSupportMultipleWindows={false}
        allowsLinkPreview={false}
        contentInset={{ bottom: insets.bottom }}
        // iOS-only; Android's native prop expects a number and crashes on the "normal" string.
        decelerationRate={Platform.OS === 'ios' ? 'normal' : undefined}
      />
    );
  } else if (review.error instanceof OfflineUnavailableError) {
    body = (
      <Message
        styles={styles}
        title="Ревюто не е достъпно офлайн"
        text="Свържете се с интернет, за да го прочетете, или го запазете „За по-късно“, докато сте онлайн."
      />
    );
  } else if (catalogStatus === 'ready' && !book) {
    body = <Message styles={styles} title="Ревюто не е намерено" text="Възможно е да е било премахнато." />;
  } else if (review.error || catalogStatus === 'error') {
    body = (
      <Message
        styles={styles}
        title="Неуспешно зареждане"
        text="Проверете връзката с интернет."
        action={{ label: 'Опитай отново', onPress: () => review.refetch() }}
      />
    );
  } else {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Stack.Header hidden />
      <View style={styles.header}>
        <IconButton label="Назад" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back_ios_new', web: 'arrow_back_ios_new' }}
            tintColor={colors.text}
            size={22}
          />
        </IconButton>
        <View style={styles.headerRight}>
          <IconButton label="Размер на текста" onPress={onTextSize}>
            <Text style={styles.aa}>Aa</Text>
          </IconButton>
          {online && (
            <IconButton label="Сподели" onPress={onShare}>
              <SymbolView
                name={{ ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' }}
                tintColor={colors.text}
                size={22}
              />
            </IconButton>
          )}
          <IconButton label="Начало" onPress={goHome}>
            <SymbolView
              name={{ ios: 'house', android: 'home', web: 'home' }}
              tintColor={colors.text}
              size={22}
            />
          </IconButton>
        </View>
      </View>
      {!online && <OfflineBanner />}
      {body}
    </View>
  );
}

/** Internal review links open in-app; everything else goes to the system browser. */
async function openLink(url: string) {
  if (!/^https?:/i.test(url)) {
    Linking.openURL(url).catch(() => {});
    return;
  }
  const parsed = new URL(url);
  if (parsed.hostname.replace(/^www\./, '') === new URL(SITE_URL).hostname) {
    const slug = parsed.pathname.split('/').filter(Boolean).pop();
    const postId = slug ? await fetchPostIdBySlug(slug).catch(() => null) : null;
    if (postId && useCatalog.getState().byId.has(postId)) {
      router.push({ pathname: '/review/[id]', params: { id: String(postId) } });
      return;
    }
  }
  WebBrowser.openBrowserAsync(url);
}

function IconButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [iconButtonStyle, pressed && { opacity: 0.5 }]}>
      {children}
    </Pressable>
  );
}

const iconButtonStyle = { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' } as const;

function Message({
  styles,
  title,
  text,
  action,
}: {
  styles: ReturnType<typeof createStyles>;
  title: string;
  text: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.messageTitle}>{title}</Text>
      <Text style={styles.messageText}>{text}</Text>
      {action && (
        <Pressable accessibilityRole="button" onPress={action.onPress} style={styles.messageButton}>
          <Text style={styles.messageButtonText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.surface },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingTop: 4,
      paddingBottom: 4,
    },
    headerRight: { flexDirection: 'row' },
    aa: { fontFamily: FontFamily.serifBold, fontSize: 17, color: c.text },
    web: { flex: 1, backgroundColor: c.surface },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
    messageTitle: {
      fontFamily: FontFamily.serifBold,
      fontSize: 18,
      color: c.text,
      textAlign: 'center',
    },
    messageText: {
      fontFamily: FontFamily.sans,
      fontSize: 15,
      lineHeight: 21,
      color: c.textMuted,
      textAlign: 'center',
    },
    messageButton: {
      marginTop: 12,
      height: 44,
      paddingHorizontal: 20,
      borderRadius: 22,
      backgroundColor: c.accent,
      justifyContent: 'center',
    },
    messageButtonText: { fontFamily: FontFamily.sansSemiBold, fontSize: 15, color: c.onAccent },
  });
}
