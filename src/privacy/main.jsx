import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';

function PrivacyPage() {
  return (
    <main className="privacy-page">
      <div className="privacy-shell">
        <header className="privacy-header">
          <a className="privacy-github-link" href="https://github.com/byeco/OmniTab" target="_blank" rel="noreferrer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .7a11.3 11.3 0 0 0-3.58 22.02c.57.1.78-.25.78-.55v-2.15c-3.17.69-3.84-1.34-3.84-1.34-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.33.96.1-.74.4-1.25.73-1.54-2.53-.29-5.19-1.27-5.19-5.65 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.03 0 0 .96-.31 3.12 1.17a10.8 10.8 0 0 1 5.68 0c2.16-1.48 3.12-1.17 3.12-1.17.62 1.58.23 2.74.11 3.03.73.8 1.18 1.82 1.18 3.07 0 4.39-2.67 5.35-5.21 5.63.41.35.78 1.04.78 2.1v3.12c0 .3.2.66.79.55A11.3 11.3 0 0 0 12 .7Z" />
            </svg>
            <span>GitHub / byeco</span>
          </a>
          <div className="privacy-header-right">
            <div className="privacy-brand">
              <span className="privacy-brand-mark">B</span>
              <div>
                <strong>BYECO</strong>
                <span>UI Cloner</span>
              </div>
            </div>
            <span className="privacy-badge">BYECO tarafından hazırlanmıştır</span>
          </div>
        </header>

        <section className="privacy-hero">
          <p className="privacy-eyebrow">BYECO UI CLONER</p>
          <h1>Gizlilik politikası ve sözleşmeler</h1>
          <p>
            Bu sayfa, BYECO UI Cloner kullanılırken verilerin nasıl işlendiğini,
            hangi seçeneklerin sunulduğunu ve kullanıcı sorumluluklarını açıklar.
          </p>
          <p className="privacy-updated">Son güncelleme: 18 Eylül 2026</p>
          <div className="privacy-status-row">
            <span><i /> Açık kaynak ürün</span>
            <span>React + Tailwind</span>
            <span>BYECO AI</span>
          </div>
        </section>

        <div className="privacy-grid">
          <article className="privacy-card">
            <span className="privacy-number">01</span>
            <h2>Ne topluyoruz?</h2>
            <p>
              Uzantı, yalnızca kullanıcının açıkça seçtiği web öğesinin DOM,
              metin, boyut, görsel stil ve gerektiğinde ekran görüntüsü bilgilerini
              kod üretme amacıyla işler. Gezinti geçmişi, reklam profili veya
              analitik davranış kaydı oluşturulmaz.
            </p>
          </article>

          <article className="privacy-card">
            <span className="privacy-number">02</span>
            <h2>Yapay zeka bağlantısı</h2>
            <p>
              BYECO AI modu seçildiğinde seçilen öğe bilgisi BYECO sunucusu
              üzerinden işlenir ve ortak kullanım kotası uygulanır. Doğrudan
              Groq API modu seçildiğinde istek kullanıcının kendi API anahtarıyla
              gönderilir ve BYECO ortak kotası uygulanmaz.
            </p>
          </article>

          <article className="privacy-card">
            <span className="privacy-number">03</span>
            <h2>Yerel depolama</h2>
            <p>
              Dil, bağlantı tercihi, model seçimi, kişisel API anahtarı ve ortak
              kullanım sayacı Chrome yerel depolamasında tutulur. API anahtarı
              BYECO sunucusuna gönderilmez. Kullanıcı ayarlar bölümünden yerel
              verilerini istediği zaman temizleyebilir.
            </p>
          </article>

          <article className="privacy-card">
            <span className="privacy-number">04</span>
            <h2>Kullanıcı sorumluluğu</h2>
            <p>
              Kullanıcı, incelediği web içeriğini ve kullandığı API anahtarını
              paylaşmaya yetkili olduğunu kabul eder. Oluşturulan kodu ve üçüncü
              taraf hizmetlerin kullanım şartlarını üretime almadan önce kontrol
              etmek kullanıcının sorumluluğundadır.
            </p>
          </article>
        </div>

        <section className="privacy-terms">
          <h2>Kullanım koşulları</h2>
          <ul>
            <li>BYECO UI Cloner bir geliştirme ve prototipleme aracıdır.</li>
            <li>Uzantı, seçilen içeriğin telif ve erişim izinlerini doğrulamaz.</li>
            <li>Yapay zeka çıktıları insan tarafından gözden geçirilmelidir.</li>
            <li>Hizmet kötüye kullanım, otomatik tarama veya yetkisiz veri toplama için kullanılamaz.</li>
          </ul>
        </section>

        <footer className="privacy-footer">
          <strong>BYECO</strong>
          <span>BYECO UI Cloner ürünüdür.</span>
          <a href="https://github.com/byeco/OmniTab" target="_blank" rel="noreferrer">GitHub’da görüntüle ↗</a>
        </footer>
      </div>
    </main>
  );
}

createRoot(document.getElementById('privacy-root')).render(<PrivacyPage />);
