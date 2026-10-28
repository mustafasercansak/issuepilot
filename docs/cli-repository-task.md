# Kontrollü CLI düzeltmesi

INVENTORY_TASK_KIND=cli-repository, GitHub repository girdisindeki iki gerçek dot-segment hatasını düzeltmek için kullanılan sınırlı görev tipidir. INVENTORY_ISSUE_NUMBER hedef issue'yu seçer. Bu genel amaçlı kod yazma veya tüm issue'ları çözme desteği değildir.

Mevcut CLI octocat/. ve octocat/.. girdilerini sözdizimsel olarak kabul eder. URL normalizasyonu nedeniyle octocat/.. için /repos/issues/1 yolu oluşur. Hata, ağ kapalı bir fetch mock'u ile gerçek CLI üzerinde yeniden üretilmiştir. test/fixtures/cli-before-dot-fix.ts bu gerçek hata durumunun değiştirilmemiş kaynak snapshot'ıdır; sentetik bir mutasyon değildir.

## Çalışma

1. Ready + Allowed kontrol edilir; kart In progress olur ve görev dalı açılır.
2. Sabit davranış testi mevcut derlenmiş CLI üzerinde çalıştırılarak hata gösterilir. Alt sürece API anahtarları ve GitHub token'ları aktarılmaz; fetch mock'lanır.
3. Model src/cli.ts ve package.json kaynaklarından yalnızca bir regex JSON alanı üretir.
4. Desen uzunluğu/anchor'ları ve doğru/yanlış giriş örnekleri süre sınırlı, secrets içermeyen bir alt süreçte kontrol edilir. Bu örnekler regex'in tüm girdilerdeki davranışını veya performansını matematiksel olarak kanıtlamaz; insan incelemesi gerekir.
5. CLI'da yalnızca eski doğrulama ifadesi JSON-escaped RegExp kurucusuyla değiştirilir. İfadenin dışındaki kaynak aynen korunur. Model keyfi dosya, komut veya test kodu üretmez.
6. src/cli.ts ve uygulamanın sabit davranış testi test/cli-repository-regression.test.mjs aynı Git tree/commit içinde, force kullanılmadan kaydedilir. Başka dosya değiştirilemez; mevcut regresyon dosyasının üzerine yazılmaz.
7. PR açılır, In review doğrulanır. PR commit'i ayrı CI çalışmasında derlenip test edilir ve sonucu PR üzerinde IssuePilot / CI olarak raporlanır. Test işi AI/provider veya proje secret'larını almaz.

## Kontroller ve kurtarma

Yeni davranış testi dot-segment ve diğer bozuk girdilerde ağ çağrısı yapılmadığını; .github, noktalı ve tireli repo isimlerinin mevcut davranışının korunduğunu kontrol eder. Başarılı desen hazırlanması tam CLI davranışının yerine geçmez; PR CI'ı eklenen gerçek davranış testini çalıştırır.

Kurtarma sırasında ana kod dosyasının modified ve regresyon testinin added olduğu, commit'in yalnızca bu iki dosyayı değiştirdiği, kaynak parmak izi ve test içeriğinin birebir eşleştiği doğrulanır. Kaydedilmiş aday değişmişse otomatik üzerine yazılmaz. Merge insana aittir.

Görev main üzerinde çözüldükten sonra eski doğrulama ifadesi bulunmayacağından aynı görev tipi yeni bir düzeltme uydurmaz; açıkça durur. Yeni hata türleri için ayrıca kapsam ve doğrulama tanımlanmalıdır.
