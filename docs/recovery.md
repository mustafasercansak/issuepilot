# Hata sonrası devam etme

## Kaydedilen durum

Her görevin dalı issuepilot/inventory-N; çıktısı #1 için docs/repository-inventory.md, sonraki işler için docs/technical-summary-N.md dosyasıdır.

Belge commit'i issue numarası, başlangıç commit'i, kullanılan model ve üç kaynak dosyanın SHA-256 parmak izini taşır. Kaydedilmiş belge kullanılmadan önce commit'in tek ebeveyni, tek eklenen dosyası, kaynak parmak izi, başlangıcın workflow revision'ına atalık ilişkisi, Markdown biçimi ve kaynak bağlantıları doğrulanır. Bu bir kriptografik üretici kimlik doğrulaması değildir; güvenilir repo erişiminin yerine geçmez.

Kaynak içeriği değişmişse veya dal elle değiştirilmişse otomatik üzerine yazılmaz; Needs-Human ile durur. Eski #1 pilotunun checkpoint bilgisi taşımayan commit'i ve elle açılmış PR'ı otomatik recovery kapsamında değildir; mevcut PR #2 korunur.

## Aynı çalışma içindeki kurtarma

İşe başlandıktan sonraki GitHub HTTP 5xx veya ağ/timeout hatasında bir kez uzak durum yeniden okunur. Körlemesine write tekrarı yapılmaz: dal, belge ve açık PR kontrol edilir.

- Dal oluşturuldu ama yanıt kayboldu: mevcut dal kullanılır.
- Belge kaydedildi ama yanıt kayboldu: checkpoint doğrulanıp AI çağrısı yapılmadan kullanılır.
- Belge write işlemi kaydedilmediyse: aynı süreçte bellekte tutulan model çıktısı yeniden kullanılır.
- PR açıldı ama yanıt kayboldu: issue işaretli mevcut açık PR kullanılır, kopya açılmaz.
- Pano In review oldu ama etiket güncellenemedi: aynı PR üzerinden eksik geçiş tamamlanır.

Model çağrısının kendisi, kota hataları, yetki hataları ve doğrulama hataları otomatik tekrarlanmaz. Model yanıtı henüz kalıcı olarak kaydedilmeden süreç tamamen kaybolursa model çıktısı kurtarılamaz; yeni çalışmada tekrar üretim gerekebilir. Ücretli fallback yoktur.

İlk claim öncesindeki hatalar ve iki sistem arasındaki tüm yazılar atomik değildir. Pano/etiket arasında kalan durumlar insan incelemesi gerektirebilir.

## Sonraki çalışmada kurtarma

Needs-Human için insan sorunu inceledikten sonra kartı Ready yapıp Allowed ekler. Varsa doğrulanmış belge ve açık PR kullanılır; kaynaklar değişmemişse model anahtarı olmadan bile PR aşaması tamamlanabilir.

Workflow zorla kesildiği için etiket Working kaldıysa **Actions → Issue intake → Run workflow** ekranından ilgili issue ve **resume_working=true** seçilir. Bu yalnızca yapılandırılmış issue, Working veya In-Review etiketi ve In progress/In review kartı için geçerlidir. In-Review seçimi mevcut PR/pano eşitlemesini doğrulamak içindir. Planlı tarama bu görevi kendiliğinden yeniden almaz. Rejected her zaman engeller.

İnsan tarafından kapatılmış PR yeniden açılmaz; tanınmayan dal/PR üzerine yazılmaz. Otomatik merge yoktur.

PR tamamlanırken önce issue etiketleri güncellenir, ardından pano In review yapılır. API onayı dışında kart durumu da yeniden okunarak doğrulanır. Önceki In progress durumuna geri dönen geçiş sınırlı sayıda düzeltilir; Ready/Done gibi beklenmeyen insan geçişleri üzerine yazılmaz.

Kontrollü CLI görevinde checkpoint iki dosyayı atomik bir commit olarak içerir: src/cli.ts modified ve sabit regresyon testi added. Fazladan dosya veya değişmiş test içeriği reddedilir. [CLI kapsamı](cli-repository-task.md).
