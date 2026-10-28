# Ready kapısı

Görev alma kuralı: yapılandırılmış panoda **Status = Ready** ve issue üzerinde **Agent::Allowed**.

## Yapılandırma

- `PROJECT_ID`: hedef GitHub Project node ID. Bu repo için `PVT_kwHOAr3aNM4BpEZa` (mustafasercansak / project 7).
- `PROJECT_TOKEN`: Actions repository secret. Kişisel Projects panosunu ve private issue içeriğini okuyabilmelidir. Classic PAT için `read:project` ve private repo içeriği için `repo` kapsamları gerekir. Mümkünse kısa süreli ve ihtiyaca göre daraltılmış bir token kullanın. İş akışı pano verisini yalnızca okur.
- `PROJECT_POLLING_ENABLED=true`: Ready değişimini yakalamak için 30 dakikalık kontrolü açar. Token eklenene kadar false tutulur.
- `INVENTORY_ISSUE_NUMBER`: ilk pilotun işleyeceği tek issue. Tüm Ready görevlerini işleyen genel kuyruk henüz yoktur.

GitHub'ın repository `GITHUB_TOKEN`'ı kişisel Projects panosuna yeterli erişimi vermez. Mevcut gh oturum anahtarı secret olarak kopyalanmaz. Yeni token GitHub Settings → Developer settings → Personal access tokens bölümünden oluşturulup repo Actions secret'ına eklenmelidir.

## Çalışma

Allowed eklendiğinde ve manuel çalıştırmada durum hemen kontrol edilir. Pano sütunu değişimi issue label olayı değildir; yalnızca Ready'ye taşıma bu nedenle periyodik kontrolde algılanır. GitHub schedule çalışmaları gecikebilir. Private repoda tarama Actions dakikası tüketir; 30 dakika aralığı dahil kota tüketimini azaltmak için seçildi, tam ücretsiz çalışma garantisi değildir.

Pano kontrolü CLI intake ve AI runner içinde uygulanır. Yetki veya GraphQL hatasında AI çağrısı ve PR yazımı yapılmaz. Pano sayfaları cursor ile gezilir; hedef issue başka projede Ready olsa bile seçilen panonun durumu belirleyicidir.

Ready'den alınan görevler bu sürümde panoda otomatik In progress/In review/Done yapılmaz. Issue etiketleri güncellenir. İş sırasında kartı Ready'den çıkarmak, yayımlama kontrolünde durma nedenidir. Otomatik pano geçişleri ayrı bir geliştirmedir.
